from django.contrib import admin
from .models import (ClinicalEvent, LabResult, Diagnosis, Prescription,
                     ImagingStudy, Procedure, ClinicalNote, VitalSigns)


@admin.register(ClinicalEvent)
class ClinicalEventAdmin(admin.ModelAdmin):
    list_display  = ["patient", "event_type", "timestamp", "doctor", "is_flagged"]
    list_filter   = ["event_type", "is_flagged"]
    search_fields = ["patient__patient_id", "patient__name", "description"]
    date_hierarchy = "timestamp"
    ordering      = ["-timestamp"]


@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ["event", "panel", "meld_score", "child_pugh_category"]
    list_filter  = ["panel", "rejection_episode"]


@admin.register(Diagnosis)
class DiagnosisAdmin(admin.ModelAdmin):
    list_display  = ["event", "icd_code", "description", "type", "is_active"]
    list_filter   = ["type", "is_active"]
    search_fields = ["icd_code", "description"]


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ["event", "drug_name", "dose", "category", "is_active"]
    list_filter  = ["category", "is_active", "route"]


@admin.register(ImagingStudy)
class ImagingStudyAdmin(admin.ModelAdmin):
    list_display = ["event", "modality", "body_part", "status"]
    list_filter  = ["modality", "status"]


@admin.register(Procedure)
class ProcedureAdmin(admin.ModelAdmin):
    list_display = ["event", "procedure_name", "operative_time"]


@admin.register(ClinicalNote)
class ClinicalNoteAdmin(admin.ModelAdmin):
    list_display = ["event", "note_type"]
    list_filter  = ["note_type"]


@admin.register(VitalSigns)
class VitalSignsAdmin(admin.ModelAdmin):
    list_display = ["event", "systolic_bp", "diastolic_bp", "heart_rate", "oxygen_sat"]
