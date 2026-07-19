from django.conf import settings
from django.db import models


class ClinicalEvent(models.Model):
    """
    Central record for every clinical data point on a patient.
    Each typed subtype (LabResult, Diagnosis, …) links here via OneToOneField.
    """
    EVENT_TYPES = [
        ("lab",          "Laboratory Result"),
        ("diagnosis",    "Diagnosis"),
        ("prescription", "Prescription"),
        ("imaging",      "Imaging Study"),
        ("procedure",    "Procedure"),
        ("note",         "Clinical Note"),
        ("vital",        "Vital Signs"),
    ]

    patient     = models.ForeignKey("patients.Patient", on_delete=models.CASCADE,
                                    related_name="clinical_events")
    doctor      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                    null=True, blank=True, related_name="clinical_events")
    event_type  = models.CharField(max_length=20, choices=EVENT_TYPES, db_index=True)
    timestamp   = models.DateTimeField(db_index=True)
    description = models.TextField(blank=True)
    metadata    = models.JSONField(default=dict, blank=True)
    is_flagged  = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes  = [
            models.Index(fields=["patient", "event_type"]),
            models.Index(fields=["patient", "timestamp"]),
            models.Index(fields=["is_flagged"]),
        ]

    def __str__(self):
        return f"{self.patient.patient_id} — {self.get_event_type_display()} @ {self.timestamp:%Y-%m-%d}"


class LabResult(models.Model):
    PANEL_CHOICES = [
        ("liver",      "Liver Function"),
        ("renal",      "Renal Function"),
        ("coag",       "Coagulation"),
        ("hematology", "Hematology"),
        ("full",       "Full Panel"),
    ]

    event = models.OneToOneField(ClinicalEvent, on_delete=models.CASCADE,
                                 related_name="lab_result")
    panel = models.CharField(max_length=15, choices=PANEL_CHOICES, default="full")

    # Liver
    alt       = models.FloatField(null=True, blank=True)
    ast       = models.FloatField(null=True, blank=True)
    bilirubin = models.FloatField(null=True, blank=True)
    ggt       = models.FloatField(null=True, blank=True)
    alp       = models.FloatField(null=True, blank=True)
    # Renal
    creatinine = models.FloatField(null=True, blank=True)
    urea       = models.FloatField(null=True, blank=True)
    # Coagulation
    inr     = models.FloatField(null=True, blank=True)
    albumin = models.FloatField(null=True, blank=True)
    # Hematology
    wbc        = models.FloatField(null=True, blank=True)
    hemoglobin = models.FloatField(null=True, blank=True)
    platelets  = models.FloatField(null=True, blank=True)
    # Transplant-specific
    tacrolimus_level    = models.FloatField(null=True, blank=True)
    meld_score          = models.FloatField(null=True, blank=True)
    child_pugh_score    = models.IntegerField(null=True, blank=True)
    child_pugh_category = models.CharField(max_length=1, blank=True)
    rejection_episode   = models.BooleanField(null=True, blank=True)
    rejection_grade     = models.CharField(max_length=10, blank=True)

    class Meta:
        verbose_name = "Lab Result"

    def __str__(self):
        return f"Lab — {self.event.patient.patient_id} @ {self.event.timestamp:%Y-%m-%d}"


class Diagnosis(models.Model):
    TYPE_CHOICES = [("primary", "Primary"), ("secondary", "Secondary"),
                    ("complication", "Complication")]

    event       = models.OneToOneField(ClinicalEvent, on_delete=models.CASCADE,
                                       related_name="diagnosis")
    icd_code    = models.CharField(max_length=20, blank=True)
    description = models.CharField(max_length=300)
    type        = models.CharField(max_length=15, choices=TYPE_CHOICES, default="primary")
    onset_date  = models.DateField(null=True, blank=True)
    is_active   = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Diagnosis"
        verbose_name_plural = "Diagnoses"

    def __str__(self):
        return f"{self.icd_code} {self.description}"


class Prescription(models.Model):
    ROUTE_CHOICES    = [("oral","Oral"),("iv","IV"),("sc","Subcutaneous"),("im","IM"),("topical","Topical")]
    CATEGORY_CHOICES = [
        ("immunosuppressant", "Immunosuppressant"),
        ("antiviral",  "Antiviral"),
        ("antibiotic", "Antibiotic"),
        ("supportive", "Supportive"),
        ("other",      "Other"),
    ]

    event      = models.OneToOneField(ClinicalEvent, on_delete=models.CASCADE,
                                      related_name="prescription")
    drug_name  = models.CharField(max_length=200)
    dose       = models.CharField(max_length=60)
    frequency  = models.CharField(max_length=60)
    route      = models.CharField(max_length=15, choices=ROUTE_CHOICES, default="oral")
    category   = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="other")
    start_date = models.DateField()
    end_date   = models.DateField(null=True, blank=True)
    is_active  = models.BooleanField(default=True)
    notes      = models.TextField(blank=True)

    class Meta:
        verbose_name = "Prescription"

    def __str__(self):
        return f"{self.drug_name} {self.dose}"


class ImagingStudy(models.Model):
    MODALITY_CHOICES = [
        ("ultrasound", "Ultrasound"),
        ("ct",         "CT Scan"),
        ("mri",        "MRI"),
        ("xray",       "X-Ray"),
        ("biopsy",     "Biopsy"),
        ("pet",        "PET Scan"),
    ]
    STATUS_CHOICES = [
        ("normal",    "Normal"),
        ("mild",      "Mild Abnormality"),
        ("abnormal",  "Abnormal"),
        ("critical",  "Critical Finding"),
    ]

    event      = models.OneToOneField(ClinicalEvent, on_delete=models.CASCADE,
                                      related_name="imaging_study")
    modality   = models.CharField(max_length=15, choices=MODALITY_CHOICES)
    body_part  = models.CharField(max_length=100, blank=True)
    findings   = models.TextField(blank=True)
    impression = models.TextField(blank=True)
    status     = models.CharField(max_length=15, choices=STATUS_CHOICES, default="normal")

    class Meta:
        verbose_name = "Imaging Study"
        verbose_name_plural = "Imaging Studies"


class Procedure(models.Model):
    event          = models.OneToOneField(ClinicalEvent, on_delete=models.CASCADE,
                                          related_name="procedure")
    procedure_name = models.CharField(max_length=200)
    procedure_code = models.CharField(max_length=20, blank=True)

    # Transplant-specific operative metrics
    operative_time          = models.IntegerField(null=True, blank=True)
    cold_ischemia_time      = models.IntegerField(null=True, blank=True)
    warm_ischemia_time      = models.IntegerField(null=True, blank=True)
    anhepatic_phase_time    = models.IntegerField(null=True, blank=True)
    intraoperative_bleeding = models.IntegerField(null=True, blank=True)
    intubation_time         = models.FloatField(null=True, blank=True)
    icu_days                = models.FloatField(null=True, blank=True)
    postop_hospital_days    = models.FloatField(null=True, blank=True)
    notes                   = models.TextField(blank=True)

    class Meta:
        verbose_name = "Procedure"


class ClinicalNote(models.Model):
    NOTE_TYPES = [
        ("admission",  "Admission Note"),
        ("progress",   "Progress Note"),
        ("discharge",  "Discharge Summary"),
        ("consult",    "Consultation"),
        ("procedure",  "Procedure Note"),
        ("followup",   "Follow-up Note"),
    ]

    event     = models.OneToOneField(ClinicalEvent, on_delete=models.CASCADE,
                                     related_name="clinical_note")
    note_type = models.CharField(max_length=15, choices=NOTE_TYPES, default="progress")
    content   = models.TextField()

    class Meta:
        verbose_name = "Clinical Note"


class VitalSigns(models.Model):
    event            = models.OneToOneField(ClinicalEvent, on_delete=models.CASCADE,
                                            related_name="vitals")
    systolic_bp      = models.IntegerField(null=True, blank=True)
    diastolic_bp     = models.IntegerField(null=True, blank=True)
    heart_rate       = models.IntegerField(null=True, blank=True)
    temperature      = models.FloatField(null=True, blank=True)
    oxygen_sat       = models.FloatField(null=True, blank=True)
    respiratory_rate = models.IntegerField(null=True, blank=True)
    weight_kg        = models.FloatField(null=True, blank=True)
    height_cm        = models.FloatField(null=True, blank=True)
    pain_score       = models.IntegerField(null=True, blank=True)

    class Meta:
        verbose_name = "Vital Signs"
        verbose_name_plural = "Vital Signs"
