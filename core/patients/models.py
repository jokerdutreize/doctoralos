from django.conf import settings
from django.db import models


class Patient(models.Model):
    SEX_CHOICES      = [(1, "Male"), (2, "Female")]
    STATUS_CHOICES   = [("Alive", "Alive"), ("Dead", "Dead"),
                        ("Inpatient", "Inpatient"), ("Outpatient", "Outpatient"),
                        ("Discharged", "Discharged")]
    CATEGORY_CHOICES = [("A", "A"), ("B", "B"), ("C", "C")]
    BLOOD_CHOICES    = [("A+","A+"),("A-","A-"),("B+","B+"),("B-","B-"),
                        ("AB+","AB+"),("AB-","AB-"),("O+","O+"),("O-","O-")]

    # ── Identifiers ───────────────────────────────────────────────────────────
    patient_id             = models.CharField(max_length=20, unique=True, db_index=True)
    mrn                    = models.CharField(max_length=30, blank=True,
                                              verbose_name="Medical Record Number")
    hospitalization_number = models.CharField(max_length=20, blank=True)

    # ── Demographics ──────────────────────────────────────────────────────────
    name          = models.CharField(max_length=120)
    first_name    = models.CharField(max_length=60, blank=True)
    last_name     = models.CharField(max_length=60, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    sex           = models.IntegerField(choices=SEX_CHOICES, null=True, blank=True)
    age           = models.FloatField(null=True, blank=True)
    blood_type    = models.CharField(max_length=4, choices=BLOOD_CHOICES, blank=True)
    nationality   = models.CharField(max_length=60, blank=True)

    # ── Contact ───────────────────────────────────────────────────────────────
    phone   = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)

    # ── Emergency contact ─────────────────────────────────────────────────────
    emergency_contact_name     = models.CharField(max_length=120, blank=True)
    emergency_contact_phone    = models.CharField(max_length=30, blank=True)
    emergency_contact_relation = models.CharField(max_length=60, blank=True)

    # ── Insurance ─────────────────────────────────────────────────────────────
    insurance_provider = models.CharField(max_length=120, blank=True)
    insurance_number   = models.CharField(max_length=60, blank=True)

    # ── Hospital assignment ───────────────────────────────────────────────────
    primary_doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="assigned_patients",
    )
    department = models.ForeignKey(
        "organizations.Department", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="patients",
    )
    bed = models.OneToOneField(
        "organizations.Bed", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="current_patient",
    )
    admission_date = models.DateField(null=True, blank=True)
    discharge_date = models.DateField(null=True, blank=True)

    # ── Clinical status ───────────────────────────────────────────────────────
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, blank=True)

    # ── Surgery ───────────────────────────────────────────────────────────────
    operation_date = models.DateField(null=True, blank=True)

    # ── Diagnoses (WLT coded integers) ────────────────────────────────────────
    diagnosis_pathological = models.IntegerField(null=True, blank=True)
    diagnosis_etiological  = models.IntegerField(null=True, blank=True)
    diagnosis_coexisting   = models.IntegerField(null=True, blank=True)

    # ── Clinical scores ───────────────────────────────────────────────────────
    bmi                 = models.FloatField(null=True, blank=True)
    meld_score          = models.FloatField(null=True, blank=True)
    child_pugh_score    = models.IntegerField(null=True, blank=True)
    child_pugh_category = models.CharField(max_length=1, choices=CATEGORY_CHOICES, blank=True)

    # ── Operative metrics ─────────────────────────────────────────────────────
    cold_ischemia_time      = models.IntegerField(null=True, blank=True)
    warm_ischemia_time      = models.IntegerField(null=True, blank=True)
    operative_time          = models.IntegerField(null=True, blank=True)
    anhepatic_phase_time    = models.IntegerField(null=True, blank=True)
    intraoperative_bleeding = models.IntegerField(null=True, blank=True)
    intubation_time         = models.FloatField(null=True, blank=True)
    icu_days                = models.FloatField(null=True, blank=True)
    postop_hospital_days    = models.FloatField(null=True, blank=True)

    # ── Transplant Program (scalable — primary classification) ───────────────
    PROGRAM_CHOICES = [
        ("WHOLE_LIVER",  "Whole Liver Transplant"),
        ("SPLIT_LIVER",  "Split Liver Transplant"),
        ("LDLT",         "Living Donor Liver Transplant"),
        ("PEDIATRIC",    "Pediatric Liver Transplant"),
        ("RETRANSPLANT", "Re-transplantation"),
        ("AUXILIARY",    "Auxiliary Liver Transplant"),
        ("DOMINO",       "Domino Liver Transplant"),
    ]
    transplant_program = models.CharField(
        max_length=20, choices=PROGRAM_CHOICES, default="WHOLE_LIVER",
        db_index=True, verbose_name="Transplant Program",
    )

    GRAFT_CHOICES = [
        ("WHOLE",          "Whole Liver"),
        ("LEFT_LOBE",      "Left Lobe"),
        ("RIGHT_LOBE",     "Right Lobe"),
        ("LEFT_LATERAL",   "Left Lateral Segment"),
        ("EXTENDED_RIGHT", "Extended Right Lobe"),
        ("UNKNOWN",        "Unspecified"),
    ]
    graft_type = models.CharField(
        max_length=20, choices=GRAFT_CHOICES, default="WHOLE",
        db_index=True, verbose_name="Graft Type",
    )

    DONOR_CHOICES = [
        ("LIVING",   "Living Donor"),
        ("DECEASED", "Deceased Donor"),
        ("UNKNOWN",  "Unknown"),
    ]
    donor_type = models.CharField(
        max_length=10, choices=DONOR_CHOICES, default="UNKNOWN",
        db_index=True, verbose_name="Donor Type",
    )

    # ── Graft metrics ─────────────────────────────────────────────────────────
    graft_weight           = models.FloatField(null=True, blank=True, verbose_name="Graft weight (g)")
    recipient_weight       = models.FloatField(null=True, blank=True, verbose_name="Recipient weight (kg)")
    grwr                   = models.FloatField(null=True, blank=True, verbose_name="Graft-to-Recipient Weight Ratio (%)")
    graft_volume           = models.FloatField(null=True, blank=True, verbose_name="Graft volume (mL)")
    estimated_regeneration = models.FloatField(null=True, blank=True, verbose_name="Estimated liver regeneration (%)")

    # ── Surgical team ─────────────────────────────────────────────────────────
    surgeon           = models.CharField(max_length=120, blank=True)
    surgical_team     = models.CharField(max_length=200, blank=True)
    transplant_center = models.CharField(max_length=120, blank=True)

    # ── Legacy transplant_type (kept for backward compat) ────────────────────
    TRANSPLANT_CHOICES = [
        ("WLT", "Whole Liver Transplant"),
        ("SLT", "Split Liver Transplant"),
    ]
    transplant_type = models.CharField(
        max_length=3, choices=TRANSPLANT_CHOICES, default="WLT", db_index=True,
    )

    # ── SLT-specific ──────────────────────────────────────────────────────────
    rolf_days           = models.IntegerField(
        null=True, blank=True,
        verbose_name="Recovery of Liver Function (days)",
    )
    split_composition   = models.TextField(
        blank=True,
        verbose_name="Split liver donor composition (C-SLT)",
    )
    split_etiology      = models.TextField(
        blank=True,
        verbose_name="Split liver recipient etiology (E-SLT)",
    )
    preop_complications = models.TextField(
        blank=True,
        verbose_name="Pre-operative complications",
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering            = ["patient_id"]
        verbose_name        = "Patient"
        verbose_name_plural = "Patients"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["primary_doctor"]),
            models.Index(fields=["meld_score"]),
        ]

    def __str__(self):
        return f"{self.patient_id} — {self.name}"

    @property
    def sex_display(self):
        return "Male" if self.sex == 1 else "Female" if self.sex == 2 else ""

    @property
    def is_critical(self):
        return (self.child_pugh_category == "C" or
                (self.meld_score is not None and self.meld_score >= 25))


class PatientTimepoint(models.Model):
    """Lab results at WLT follow-up phases — kept for backward compatibility."""
    TIMEPOINT_CHOICES = [
        ("preop",   "Pre-operative"),
        ("surgery", "Intraoperative"),
        ("week1",   "Post-op Week 1"),
        ("month1",  "Post-op Month 1"),
        ("year1",   "Post-op Year 1"),
    ]

    patient   = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="timepoints")
    timepoint = models.CharField(max_length=10, choices=TIMEPOINT_CHOICES)
    date      = models.DateField(null=True, blank=True)

    alt        = models.FloatField(null=True, blank=True)
    ast        = models.FloatField(null=True, blank=True)
    bilirubin  = models.FloatField(null=True, blank=True)
    ggt        = models.FloatField(null=True, blank=True)
    alp        = models.FloatField(null=True, blank=True)
    creatinine = models.FloatField(null=True, blank=True)
    urea       = models.FloatField(null=True, blank=True)
    inr        = models.FloatField(null=True, blank=True)
    albumin    = models.FloatField(null=True, blank=True)
    wbc        = models.FloatField(null=True, blank=True)
    hemoglobin = models.FloatField(null=True, blank=True)
    platelets  = models.FloatField(null=True, blank=True)

    meld_score          = models.FloatField(null=True, blank=True)
    child_pugh_score    = models.IntegerField(null=True, blank=True)
    child_pugh_category = models.CharField(max_length=1, blank=True)

    tacrolimus_level  = models.FloatField(null=True, blank=True)
    rejection_episode = models.BooleanField(null=True, blank=True)
    rejection_grade   = models.CharField(max_length=10, blank=True)
    notes             = models.TextField(blank=True)

    class Meta:
        unique_together = ("patient", "timepoint")
        ordering        = ["patient", "timepoint"]
        verbose_name    = "Patient Timepoint"

    def __str__(self):
        return f"{self.patient.patient_id} — {self.get_timepoint_display()}"
