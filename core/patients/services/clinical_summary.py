"""
Rule-based clinical summary generator for liver transplant patients.
Produces a structured JSON-serialisable dict from a Patient instance.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal

from ..models import Patient, PatientTimepoint

StatusLevel   = Literal["stable", "monitoring", "concern", "critical"]
FindingStatus = Literal["normal", "mild", "moderate", "severe"]
RecommPrio    = Literal["routine", "monitor", "urgent"]


@dataclass
class _Finding:
    category: str
    status: FindingStatus
    text: str
    detail: str = ""


@dataclass
class _Recommendation:
    priority: RecommPrio
    text: str


@dataclass
class _Flag:
    flag: str
    severity: str
    text: str


def generate_clinical_summary(patient: Patient) -> dict:
    findings:       list[_Finding]       = []
    recommendations: list[_Recommendation] = []
    flags:          list[_Flag]          = []

    meld    = float(patient.meld_score   or 0)
    cp_cat  = patient.child_pugh_category or ""
    cp_scr  = int(patient.child_pugh_score or 0)
    bmi     = float(patient.bmi           or 0)
    cit     = float(patient.cold_ischemia_time or 0)      # minutes
    bleed   = float(patient.intraoperative_bleeding or 0)  # mL
    icu_d   = float(patient.icu_days      or 0)
    intub_h = float(patient.intubation_time or 0)
    status  = patient.status or ""

    # ── Pre-operative severity ─────────────────────────────────────────────────
    if meld >= 30:
        findings.append(_Finding("hepatic_preop", "severe",
            f"High pre-transplant MELD score ({meld:.1f}) indicating advanced hepatic dysfunction at listing."))
        flags.append(_Flag("high_meld", "high", f"MELD ≥ 30 — elevated perioperative risk."))
    elif meld >= 20:
        findings.append(_Finding("hepatic_preop", "moderate",
            f"Moderate pre-transplant MELD score ({meld:.1f}) at listing."))
    elif meld > 0:
        findings.append(_Finding("hepatic_preop", "mild",
            f"Pre-transplant MELD score {meld:.1f} — moderate disease burden at listing."))

    if cp_cat == "C":
        findings.append(_Finding("child_pugh", "severe",
            f"Child-Pugh class C (score {cp_scr}) — decompensated cirrhosis at listing."))
        flags.append(_Flag("child_pugh_c", "high", "Child-Pugh C — complex post-transplant course expected."))
    elif cp_cat == "B":
        findings.append(_Finding("child_pugh", "moderate",
            f"Child-Pugh class B (score {cp_scr}) at listing."))
    elif cp_cat == "A":
        findings.append(_Finding("child_pugh", "normal",
            f"Child-Pugh class A (score {cp_scr}) — compensated at listing."))

    # ── Operative factors ──────────────────────────────────────────────────────
    if cit > 600:
        h, m = int(cit // 60), int(cit % 60)
        findings.append(_Finding("intraoperative", "moderate",
            f"Prolonged cold ischemia time ({cit:.0f} min / {h}h {m}m) — risk factor for primary graft dysfunction."))
        flags.append(_Flag("prolonged_cit", "moderate", f"Cold ischemia time {cit:.0f} min."))
    elif cit > 0:
        stat: FindingStatus = "normal" if cit <= 480 else "mild"
        label = "acceptable range" if cit <= 480 else "mildly prolonged"
        findings.append(_Finding("intraoperative", stat,
            f"Cold ischemia time {cit:.0f} min — {label}."))

    if bleed > 5000:
        findings.append(_Finding("intraoperative", "severe",
            f"Significant intraoperative blood loss ({bleed:.0f} mL) — high transfusion burden."))
        flags.append(_Flag("high_bleeding", "moderate", f"Intraoperative bleeding {bleed:.0f} mL."))
    elif bleed > 2000:
        findings.append(_Finding("intraoperative", "moderate",
            f"Moderate intraoperative blood loss ({bleed:.0f} mL)."))

    # ── Post-op recovery ───────────────────────────────────────────────────────
    if icu_d > 30:
        findings.append(_Finding("recovery", "severe",
            f"Prolonged ICU admission ({icu_d:.0f} days) — complex post-operative course."))
        flags.append(_Flag("prolonged_icu", "high", f"ICU stay {icu_d:.0f} days."))
    elif icu_d > 7:
        findings.append(_Finding("recovery", "moderate",
            f"Extended ICU stay ({icu_d:.0f} days) — monitored recovery."))
    elif icu_d > 0:
        findings.append(_Finding("recovery", "normal",
            f"ICU stay {icu_d:.0f} days — within expected range."))

    if intub_h > 48:
        findings.append(_Finding("recovery", "moderate",
            f"Prolonged mechanical ventilation ({intub_h:.0f} h) — pulmonary complications possible."))
    elif intub_h > 0:
        stat2: FindingStatus = "normal" if intub_h <= 24 else "mild"
        findings.append(_Finding("recovery", stat2,
            f"Extubated at {intub_h:.0f} h post-op."))

    if bmi > 35:
        flags.append(_Flag("obesity", "moderate", f"BMI {bmi:.1f} kg/m² — increased metabolic and wound risk."))
    elif 0 < bmi < 18.5:
        flags.append(_Flag("underweight", "moderate", f"BMI {bmi:.1f} kg/m² — malnutrition risk."))

    # ── Timepoint labs ─────────────────────────────────────────────────────────
    latest_tp: PatientTimepoint | None = None
    for tp in patient.timepoints.all().order_by("timepoint"):
        if any([tp.alt, tp.ast, tp.bilirubin, tp.creatinine]):
            latest_tp = tp

    if latest_tp:
        if latest_tp.alt and latest_tp.alt > 200:
            findings.append(_Finding("hepatic_current", "severe",
                f"Elevated ALT ({latest_tp.alt:.0f} U/L) — hepatocellular injury pattern."))
        elif latest_tp.alt and latest_tp.alt > 80:
            findings.append(_Finding("hepatic_current", "moderate",
                f"Mildly elevated ALT ({latest_tp.alt:.0f} U/L)."))
        elif latest_tp.alt:
            findings.append(_Finding("hepatic_current", "normal",
                f"ALT {latest_tp.alt:.0f} U/L — within normal limits."))

        if latest_tp.bilirubin and latest_tp.bilirubin > 3.0:
            findings.append(_Finding("hepatic_current", "moderate",
                f"Elevated bilirubin ({latest_tp.bilirubin:.1f} mg/dL) — monitor for cholestasis."))

        if latest_tp.creatinine and latest_tp.creatinine > 2.0:
            findings.append(_Finding("renal", "moderate",
                f"Elevated creatinine ({latest_tp.creatinine:.1f} mg/dL) — consider CNI dose review."))
            recommendations.append(_Recommendation("monitor",
                "Review calcineurin inhibitor dosing in context of renal function."))
        elif latest_tp.creatinine:
            findings.append(_Finding("renal", "normal",
                f"Creatinine {latest_tp.creatinine:.1f} mg/dL — renal function preserved."))

        if latest_tp.rejection_episode:
            grade = f" grade {latest_tp.rejection_grade}" if latest_tp.rejection_grade else ""
            findings.append(_Finding("rejection", "severe",
                f"Acute cellular rejection{grade} documented — treatment per protocol."))
            flags.append(_Flag("rejection", "high", f"Rejection episode{grade}."))
            recommendations.append(_Recommendation("urgent",
                "Review immunosuppression — pulse steroids or rescue therapy as indicated."))

    # ── Outcome status ─────────────────────────────────────────────────────────
    if status == "Dead":
        findings.append(_Finding("outcome", "severe",
            "Patient is deceased — record maintained for research cohort analysis."))

    # ── Overall status ─────────────────────────────────────────────────────────
    all_statuses = [f.status for f in findings]
    all_severities = [r.severity for r in flags]

    if status == "Dead" or "severe" in all_statuses or "high" in all_severities:
        overall: StatusLevel = "critical" if status == "Dead" else "concern"
    elif "moderate" in all_statuses or "moderate" in all_severities:
        overall = "monitoring"
    else:
        overall = "stable"

    # ── Standard recommendations ───────────────────────────────────────────────
    if overall == "stable":
        recommendations += [
            _Recommendation("routine", "Continue current immunosuppression regimen."),
            _Recommendation("routine", "Routine laboratory follow-up in 14 days."),
            _Recommendation("routine", "Standard outpatient hepatology review."),
        ]
    elif overall == "monitoring":
        recommendations += [
            _Recommendation("monitor", "Increase laboratory monitoring frequency to every 7 days."),
            _Recommendation("routine", "Continue current immunosuppression unless labs worsen."),
            _Recommendation("monitor", "Low threshold for biopsy if enzyme trajectory deteriorates."),
        ]
    elif overall == "concern":
        recommendations = [
            _Recommendation("urgent", "Urgent hepatology review — consider liver biopsy."),
            _Recommendation("urgent", "Repeat complete metabolic panel within 48–72 hours."),
            _Recommendation("urgent", "Review and optimise immunosuppression levels."),
        ] + recommendations

    assessment = _build_narrative(patient, overall, meld, cp_cat, icu_d, status)

    return {
        "overall_status": overall,
        "assessment":      assessment,
        "findings": [
            {"category": f.category, "status": f.status, "text": f.text, "detail": f.detail}
            for f in findings
        ],
        "recommendations": [
            {"priority": r.priority, "text": r.text}
            for r in recommendations
        ],
        "risk_flags": [
            {"flag": r.flag, "severity": r.severity, "text": r.text}
            for r in flags
        ],
        "data_completeness": {
            "pre_operative":  bool(patient.meld_score and patient.child_pugh_category),
            "intraoperative": bool(patient.cold_ischemia_time and patient.operative_time),
            "post_operative": bool(patient.icu_days),
            "laboratory":     bool(latest_tp),
        },
    }


def _build_narrative(patient: Patient, overall: StatusLevel,
                     meld: float, cp_cat: str, icu_d: float, status: str) -> str:
    first = patient.name.split()[0]

    if status == "Dead":
        return (
            f"Patient {first} is deceased. "
            "The record is preserved within the WLT research cohort for retrospective analysis."
        )

    openers = {
        "stable":     f"Post-transplant course for {first} is progressing satisfactorily.",
        "monitoring": f"Post-transplant course for {first} requires ongoing surveillance.",
        "concern":    f"Post-transplant course for {first} presents clinical concerns requiring prompt review.",
    }
    opening = openers.get(overall, openers["stable"])

    risk_parts = []
    if meld >= 25:
        risk_parts.append(f"high pre-transplant MELD ({meld:.1f})")
    if cp_cat == "C":
        risk_parts.append("Child-Pugh C disease at listing")
    if icu_d > 14:
        risk_parts.append(f"prolonged ICU course ({icu_d:.0f} days)")
    middle = f" Notable risk factors include {', '.join(risk_parts)}." if risk_parts else ""

    closers = {
        "stable":     " Continue current protocol with routine surveillance.",
        "monitoring": " Enhanced monitoring is indicated with a low threshold for biopsy.",
        "concern":    " Urgent clinical review is recommended.",
    }
    closing = closers.get(overall, "")
    return opening + middle + closing
