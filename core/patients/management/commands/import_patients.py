"""
Management command: import_patients
=====================================
Parses WLT_PATIENTS_cleaned.txt and loads all records into the database.

Usage (from the core/ directory, with venv active):
    python manage.py import_patients path/to/WLT_PATIENTS_cleaned.txt

The text file has a complex multi-line, fixed-width layout exported from a
table viewer.  Each patient occupies 1–3 physical lines:

  Pattern A  (name on same line as ID):
    201816065Eric Torres   1  49  Alive  1368739  1  3  4  25.08  8  5  A  299  0  520  49  800  2  3
                                       2018-03-
                                          29

  Pattern B  (name split before/after ID line):
          Timothy                                2018-01-
    201810750          1  66  Alive  1338898  1  3  4  22.53  2.4  8  B  367  5  585  44  2000  1  8
          Garcia                                    02

The parser handles both patterns by scanning around each data line.
"""

import re
import os
from datetime import date
from django.core.management.base import BaseCommand, CommandError
from patients.models import Patient


# ─── helpers ──────────────────────────────────────────────────────────────────

# 9-digit patient ID at the very start of a line (possibly prefixed by a name)
RE_DATA = re.compile(
    r'^(?P<prefix_name>[A-Za-z ]{0,40}?)?'   # optional inline name before ID
    r'(?P<pid>\d{9})'
    r'(?P<suffix_name>[A-Za-z ]{0,40}?)?'   # optional inline name after ID
    r'\s+'
    r'(?P<rest>.+)$'
)

RE_DATE_PART1 = re.compile(r'(\d{4}-\d{2}-)')   # YYYY-MM-
RE_DATE_PART2 = re.compile(r'(\d{2})\s*$')       # DD at end of line


def _clean_name(s: str) -> str:
    return re.sub(r'\s+', ' ', s or '').strip()


def _safe_int(v: str):
    try:
        return int(float(v.strip()))
    except (ValueError, AttributeError):
        return None


def _safe_float(v: str):
    try:
        return float(v.strip())
    except (ValueError, AttributeError):
        return None


def _safe_icu(v: str):
    """ICU days field: may be 'Death', an int, or a float fraction."""
    v = v.strip()
    if v.lower() in ("death", ""):
        return None
    try:
        return float(v)
    except ValueError:
        return None


def _parse_status(tokens: list[str]) -> tuple[str, int]:
    """Find 'Alive' or 'Dead' in the token list and return (status, index)."""
    for i, t in enumerate(tokens):
        if t in ("Alive", "Dead"):
            return t, i
    return "", -1


def _parse_row(tokens: list[str]):
    """
    Parse the numeric tokens from a data line.
    Expected order after the status token:
        hosp_num d1 d2 d3 bmi meld cp_score cp_cat
        cold warm op_time anhepatic bleeding intub icu [hosp_days]
    Returns a dict of field→value.
    """
    status, si = _parse_status(tokens)
    if si < 0:
        return None

    # tokens before status:  sex  age
    before = tokens[:si]
    if len(before) < 2:
        return None
    sex = _safe_int(before[-2])
    age = _safe_float(before[-1])

    after = tokens[si + 1:]

    # after[0] = hosp_number (7+ digit integer)
    try:
        hosp_num = after[0].strip()
        d1       = _safe_int(after[1])
        d2       = _safe_int(after[2])
        d3       = _safe_int(after[3])
        bmi      = _safe_float(after[4])
        meld     = _safe_float(after[5])
        cp_score = _safe_int(after[6])
        cp_cat   = after[7].strip() if len(after) > 7 else ""
        cold     = _safe_int(after[8])  if len(after) > 8  else None
        warm     = _safe_int(after[9])  if len(after) > 9  else None
        op_time  = _safe_int(after[10]) if len(after) > 10 else None
        anhep    = _safe_int(after[11]) if len(after) > 11 else None
        bleed    = _safe_int(after[12]) if len(after) > 12 else None
        intub    = _safe_float(after[13]) if len(after) > 13 else None
        icu      = _safe_icu(after[14]) if len(after) > 14 else None
        hosp_d   = _safe_float(after[15]) if len(after) > 15 else None
    except (IndexError, ValueError):
        return None

    return dict(
        status=status, sex=sex, age=age,
        hospitalization_number=hosp_num,
        diagnosis_pathological=d1, diagnosis_etiological=d2,
        diagnosis_coexisting=d3,
        bmi=bmi, meld_score=meld,
        child_pugh_score=cp_score, child_pugh_category=cp_cat,
        cold_ischemia_time=cold, warm_ischemia_time=warm,
        operative_time=op_time, anhepatic_phase_time=anhep,
        intraoperative_bleeding=bleed,
        intubation_time=intub, icu_days=icu,
        postop_hospital_days=hosp_d,
    )


# ─── main parser ──────────────────────────────────────────────────────────────

def parse_file(filepath: str):
    """Yield (patient_id, name, operation_date, fields_dict) for every patient."""
    with open(filepath, "r", encoding="utf-8", errors="replace") as fh:
        lines = fh.readlines()

    n = len(lines)
    i = 0

    while i < n:
        raw = lines[i]
        stripped = raw.strip()

        # ── Try to match a data line ───────────────────────────────────────
        # The 9-digit ID might be preceded by up to ~40 chars of a name
        id_match = re.search(r'(\d{9})', raw)
        if not id_match:
            i += 1
            continue

        pid      = id_match.group(1)
        id_start = id_match.start()
        id_end   = id_match.end()

        # Name might be inline before the ID
        inline_name_before = raw[:id_start].strip()
        inline_name_after  = raw[id_end:].split()[0] if raw[id_end:].strip() and not raw[id_end:].strip()[0].isdigit() else ""

        # Collect the numeric payload (everything after ID on same line)
        payload = raw[id_end:].strip()
        # If the very first token of payload is a name fragment (letters), skip it
        if inline_name_after:
            payload = payload[len(inline_name_after):].strip()

        tokens = payload.split()

        # ── Look at adjacent lines for name parts and date parts ──────────
        # Scan up to 2 lines before for first-name / YYYY-MM-
        name_before = inline_name_before
        date_part1  = ""
        date_part2  = ""

        for delta in range(1, 3):
            j = i - delta
            if j < 0:
                break
            prev = lines[j].strip()
            if not prev:
                continue
            # Stop if it looks like another data line
            if re.search(r'\d{9}', prev):
                break
            dm = RE_DATE_PART1.search(prev)
            if dm:
                date_part1 = dm.group(1)
                frag = prev[:dm.start()].strip()
                if frag and not frag[0].isdigit():
                    name_before = (_clean_name(name_before + " " + frag)
                                   if name_before else frag)
            elif prev and not prev[0].isdigit():
                name_before = (_clean_name(name_before + " " + prev)
                               if name_before else prev)

        # Scan up to 2 lines after for last-name / DD
        name_after = inline_name_after
        next_skip  = 0
        for delta in range(1, 3):
            j = i + delta
            if j >= n:
                break
            nxt = lines[j].strip()
            if not nxt:
                continue
            if re.search(r'\d{9}', nxt):
                break
            dm1 = RE_DATE_PART1.search(nxt)
            dm2 = RE_DATE_PART2.search(nxt)
            if dm1:
                date_part1 = dm1.group(1)
                frag = nxt[:dm1.start()].strip()
                if frag and not frag[0].isdigit():
                    name_after = (_clean_name(name_after + " " + frag)
                                  if name_after else frag)
                next_skip = max(next_skip, delta)
            elif dm2 and not date_part2:
                date_part2 = dm2.group(1)
                frag = nxt[:dm2.start()].strip()
                if frag and not frag[0].isdigit():
                    name_after = (_clean_name(name_after + " " + frag)
                                  if name_after else frag)
                next_skip = max(next_skip, delta)

        # Build full name and date
        full_name = _clean_name(name_before + " " + name_after)
        op_date   = None
        if date_part1 and date_part2:
            try:
                op_date = date.fromisoformat(date_part1 + date_part2)
            except ValueError:
                pass

        fields = _parse_row(tokens)
        if fields and full_name:
            fields["operation_date"] = op_date
            yield pid, full_name, fields

        i += 1 + next_skip


# ─── Command ──────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Import WLT_PATIENTS_cleaned.txt into the Patient table"

    def add_arguments(self, parser):
        parser.add_argument("filepath", help="Path to WLT_PATIENTS_cleaned.txt")
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete all existing patients before import"
        )

    def handle(self, *args, **options):
        fp = options["filepath"]
        if not os.path.exists(fp):
            raise CommandError(f"File not found: {fp}")

        if options["clear"]:
            count = Patient.objects.count()
            Patient.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {count} existing records."))

        created = updated = skipped = 0

        for pid, name, fields in parse_file(fp):
            op_date = fields.pop("operation_date", None)
            try:
                obj, is_new = Patient.objects.update_or_create(
                    patient_id=pid,
                    defaults={"name": name, "operation_date": op_date, **fields},
                )
                if is_new:
                    created += 1
                else:
                    updated += 1
            except Exception as exc:
                self.stderr.write(f"  Skip {pid}: {exc}")
                skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. Created: {created}  Updated: {updated}  Skipped: {skipped}"
        ))
