"""
Management command: import_slt_patients
=========================================
Parses a CSV file of Split Liver Transplant (SLT) patients and loads them
into the database, creating Patient and PatientTimepoint records.

Usage (from core/ directory with venv active):
    python manage.py import_slt_patients path/to/SLT_patients.csv

CSV column order (0-indexed):
    0   Recipient Name
    1   D OR A DATES      (status: ALIVE / DEAD / "DATE DEAD" / empty)
    2   Hospitalization number
    3   Operation date    (MM/DD/YYYY  or  YYYY/MM/DD  or  YYYY/M/D)
    4   Diagnosis 1 — Pathological
    5   Diagnosis 2 — Etiological
    6   Diagnosis 3 — Coexisting Tumors
    7   Cold ischemia time (min)
    8   Warm ischemia time (min)
    9   Sex  (1=Male, 2=Female)
    10  Age (years)
    11  BMI
    12  MELD score
    13  Child-Pugh score
    14  Child-Pugh class  (A/B/C)
    15  Operative time (min)
    16  Anhepatic phase (min)
    17  Intraoperative bleeding (mL)
    18  Intubation time (hours)
    19  ICU days
    20  Post-op hospital days
    21  ROLF — Recovery of Liver Function (days)
    22  ALT  pre-op  (U/L)
    23  AST  pre-op  (U/L)
    24  TB   pre-op  (μmol/L)
    25  ALT  W1  post-op
    26  AST  W1  post-op
    27  TB   W1  post-op
    28  ALT  M1  post-op
    29  AST  M1  post-op
    30  TB   M1  post-op
    31  ALT  Y1  post-op
    32  AST  Y1  post-op
    33  TB   Y1  post-op
    34  Split donor composition  (C-SLT)
    35  Etiological composition  (E-SLT)
    36  Pre-operative complications
"""

import csv
import os
import re
from datetime import date, datetime
from django.core.management.base import BaseCommand, CommandError
from patients.models import Patient, PatientTimepoint

# ── helpers ───────────────────────────────────────────────────────────────────

_DEATH_WORDS = frozenset(["死亡", "死", "死 亡", "æ­»äº¡", "æ­»"])  # Chinese "death"


def _f(v: str):
    """Return stripped string or empty string."""
    return (v or "").strip()


def _num(v: str, cast=float):
    """Safe numeric conversion; returns None for empty / non-numeric / Chinese text."""
    s = _f(v)
    if not s:
        return None
    # Chinese death-marker or non-ASCII characters → skip
    if any(ord(c) > 127 for c in s):
        return None
    try:
        return cast(s)
    except ValueError:
        return None


def _int(v: str):
    r = _num(v, float)
    return int(round(r)) if r is not None else None


def _parse_date(s: str) -> date | None:
    s = _f(s)
    if not s:
        return None
    # YYYY/M/D  or  YYYY/MM/DD
    m = re.match(r'^(\d{4})/(\d{1,2})/(\d{1,2})$', s)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    # MM/DD/YYYY  or  M/D/YYYY
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', s)
    if m:
        try:
            return date(int(m.group(3)), int(m.group(1)), int(m.group(2)))
        except ValueError:
            return None
    return None


def _parse_status(s: str) -> str:
    """
    Status column values seen in the data:
        ALIVE, Alive                → Alive
        DEAD, Dead                  → Dead
        6/24/2021 DEAD              → Dead
        empty                       → (empty, stored as '')
    """
    s = _f(s).upper()
    if not s:
        return ""
    if "DEAD" in s or "DEAD" in s:
        return "Dead"
    if "ALIVE" in s:
        return "Alive"
    return ""


def _patient_id(hosp_num: str, index: int) -> str:
    """Generate a unique patient_id for SLT patients."""
    h = _f(hosp_num)
    if h and h.isdigit():
        return f"SLT-{h}"
    return f"SLT-{index:04d}"


def _parse_graft_type(c_slt: str) -> str:
    s = c_slt.lower()
    if 'left lateral' in s or 'left outer' in s:
        return 'LEFT_LATERAL'
    if 'extended right' in s:
        return 'EXTENDED_RIGHT'
    if 'left half' in s or ('left' in s and 'lobe' in s and 'lateral' not in s):
        return 'LEFT_LOBE'
    if 'right' in s:  # right half, right clover, right trilobal, right tricuspid
        return 'RIGHT_LOBE'
    return 'UNKNOWN'


def _parse_donor_type(c_slt: str) -> str:
    if 'living donor' in c_slt.lower():
        return 'LIVING'
    return 'DECEASED'


# ── main parser ───────────────────────────────────────────────────────────────

def parse_csv(filepath: str):
    """
    Yield dicts of patient + timepoint data for each row.
    Tries UTF-8 first; falls back to GBK (common Chinese encoding).
    """
    for encoding in ("utf-8-sig", "utf-8", "gbk", "gb2312", "latin-1"):
        try:
            with open(filepath, newline="", encoding=encoding, errors="replace") as fh:
                reader = csv.reader(fh)
                rows   = list(reader)
            break
        except (UnicodeDecodeError, LookupError):
            continue
    else:
        raise ValueError(f"Could not decode {filepath} with any tried encoding.")

    # Skip header row(s): the first row that starts with recognisable header text
    start = 0
    for i, row in enumerate(rows):
        if row and _f(row[0]).lower() in ("recipient name", "name", "患者姓名"):
            start = i + 1
            break

    for idx, row in enumerate(rows[start:], start=1):
        # Skip blank / short rows
        if not row or len(row) < 10:
            continue
        if not _f(row[0]):
            continue

        # ── Patient identity ──────────────────────────────────────────────────
        name     = _f(row[0])
        hosp_num = _f(row[2]) if len(row) > 2 else ""
        pid      = _patient_id(hosp_num, idx)
        status   = _parse_status(row[1] if len(row) > 1 else "")
        op_date  = _parse_date(row[3] if len(row) > 3 else "")

        # ── Clinical integers (safe access) ───────────────────────────────────
        def col(i, fn=_num):
            return fn(row[i]) if len(row) > i else None

        d1       = col(4, _int)
        d2       = col(5, _int)
        d3       = col(6, _int)
        cold     = col(7, _int)
        warm     = col(8, _int)
        sex      = col(9, _int)
        age      = col(10, _num)
        bmi      = col(11, _num)
        meld     = col(12, _num)
        cp_score = col(13, _int)
        cp_cat   = _f(row[14]).upper() if len(row) > 14 else ""
        cp_cat   = cp_cat if cp_cat in ("A", "B", "C") else ""
        op_time  = col(15, _int)
        anhep    = col(16, _int)
        bleed    = col(17, _int)
        intub    = col(18, _num)
        icu      = col(19, _num)
        posth    = col(20, _num)
        rolf     = col(21, _int)

        # ── Pre-op labs ───────────────────────────────────────────────────────
        alt_pre  = col(22, _num)
        ast_pre  = col(23, _num)
        tb_pre   = col(24, _num)

        # ── W1 labs ───────────────────────────────────────────────────────────
        alt_w1   = col(25, _num)
        ast_w1   = col(26, _num)
        tb_w1    = col(27, _num)

        # ── M1 labs ───────────────────────────────────────────────────────────
        alt_m1   = col(28, _num)
        ast_m1   = col(29, _num)
        tb_m1    = col(30, _num)

        # ── Y1 labs ───────────────────────────────────────────────────────────
        alt_y1   = col(31, _num)
        ast_y1   = col(32, _num)
        tb_y1    = col(33, _num)

        # ── SLT-specific text ─────────────────────────────────────────────────
        c_slt    = _f(row[34]) if len(row) > 34 else ""
        e_slt    = _f(row[35]) if len(row) > 35 else ""
        complic  = _f(row[36]) if len(row) > 36 else ""

        graft_type = _parse_graft_type(c_slt) if c_slt else 'UNKNOWN'
        donor_type = _parse_donor_type(c_slt)  if c_slt else 'DECEASED'

        yield {
            "patient": dict(
                patient_id=pid,
                name=name,
                hospitalization_number=hosp_num,
                status=status,
                operation_date=op_date,
                transplant_type="SLT",
                transplant_program="SPLIT_LIVER",
                graft_type=graft_type,
                donor_type=donor_type,
                sex=sex,
                age=age,
                bmi=bmi,
                meld_score=meld,
                child_pugh_score=cp_score,
                child_pugh_category=cp_cat,
                diagnosis_pathological=d1,
                diagnosis_etiological=d2,
                diagnosis_coexisting=d3,
                cold_ischemia_time=cold,
                warm_ischemia_time=warm,
                operative_time=op_time,
                anhepatic_phase_time=anhep,
                intraoperative_bleeding=bleed,
                intubation_time=intub,
                icu_days=icu,
                postop_hospital_days=posth,
                rolf_days=rolf,
                split_composition=c_slt,
                split_etiology=e_slt,
                preop_complications=complic,
            ),
            "timepoints": [
                dict(timepoint="preop",  alt=alt_pre, ast=ast_pre, bilirubin=tb_pre),
                dict(timepoint="week1",  alt=alt_w1,  ast=ast_w1,  bilirubin=tb_w1),
                dict(timepoint="month1", alt=alt_m1,  ast=ast_m1,  bilirubin=tb_m1),
                dict(timepoint="year1",  alt=alt_y1,  ast=ast_y1,  bilirubin=tb_y1),
            ],
        }


# ── Command ───────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Import SLT patient CSV into the Patient table (creates timepoints too)"

    def add_arguments(self, parser):
        parser.add_argument("filepath", help="Path to the SLT patients CSV file")
        parser.add_argument(
            "--clear-slt", action="store_true",
            help="Delete all existing SLT patients before import",
        )

    def handle(self, *args, **options):
        fp = options["filepath"]
        if not os.path.exists(fp):
            raise CommandError(f"File not found: {fp}")

        if options["clear_slt"]:
            count = Patient.objects.filter(transplant_type="SLT").count()
            Patient.objects.filter(transplant_type="SLT").delete()
            self.stdout.write(self.style.WARNING(f"Deleted {count} existing SLT records."))

        created_p = updated_p = created_t = skipped = 0

        for record in parse_csv(fp):
            p_data  = record["patient"]
            t_data  = record["timepoints"]
            pid     = p_data.pop("patient_id")

            try:
                patient, is_new = Patient.objects.update_or_create(
                    patient_id=pid,
                    defaults=p_data,
                )
                if is_new:
                    created_p += 1
                else:
                    updated_p += 1

                # Create / update timepoint records for non-empty phases
                for tp in t_data:
                    phase = tp.pop("timepoint")
                    # Only create if at least one lab value is present
                    if any(v is not None for v in tp.values()):
                        PatientTimepoint.objects.update_or_create(
                            patient=patient,
                            timepoint=phase,
                            defaults=tp,
                        )
                        created_t += 1

            except Exception as exc:
                self.stderr.write(f"  Skip '{pid}' ({p_data.get('name','')}): {exc}")
                skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nDone.  Patients: {created_p} created, {updated_p} updated, {skipped} skipped."
            f"  Timepoints upserted: {created_t}"
        ))
