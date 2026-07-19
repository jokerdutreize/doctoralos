from rest_framework import serializers
from .models import (ClinicalEvent, LabResult, Diagnosis, Prescription,
                     ImagingStudy, Procedure, ClinicalNote, VitalSigns)


class LabResultSerializer(serializers.ModelSerializer):
    class Meta:
        model  = LabResult
        exclude = ["event"]


class DiagnosisSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Diagnosis
        exclude = ["event"]


class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Prescription
        exclude = ["event"]


class ImagingStudySerializer(serializers.ModelSerializer):
    class Meta:
        model  = ImagingStudy
        exclude = ["event"]


class ProcedureSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Procedure
        exclude = ["event"]


class ClinicalNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ClinicalNote
        exclude = ["event"]


class VitalSignsSerializer(serializers.ModelSerializer):
    class Meta:
        model  = VitalSigns
        exclude = ["event"]


class ClinicalEventSerializer(serializers.ModelSerializer):
    """Full event serializer with inline subtype data."""
    doctor_name   = serializers.SerializerMethodField()
    event_display = serializers.CharField(source="get_event_type_display", read_only=True)
    subtype_data  = serializers.SerializerMethodField()

    class Meta:
        model  = ClinicalEvent
        fields = ["id", "patient", "doctor", "doctor_name", "event_type",
                  "event_display", "timestamp", "description", "is_flagged",
                  "created_at", "subtype_data"]

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name() if obj.doctor else None

    def get_subtype_data(self, obj):
        try:
            if obj.event_type == "lab":
                return LabResultSerializer(obj.lab_result).data
            if obj.event_type == "diagnosis":
                return DiagnosisSerializer(obj.diagnosis).data
            if obj.event_type == "prescription":
                return PrescriptionSerializer(obj.prescription).data
            if obj.event_type == "imaging":
                return ImagingStudySerializer(obj.imaging_study).data
            if obj.event_type == "procedure":
                return ProcedureSerializer(obj.procedure).data
            if obj.event_type == "note":
                return ClinicalNoteSerializer(obj.clinical_note).data
            if obj.event_type == "vital":
                return VitalSignsSerializer(obj.vitals).data
        except Exception:
            pass
        return None


class ClinicalEventListSerializer(serializers.ModelSerializer):
    """Compact serializer for timeline view."""
    doctor_name   = serializers.SerializerMethodField()
    event_display = serializers.CharField(source="get_event_type_display", read_only=True)

    class Meta:
        model  = ClinicalEvent
        fields = ["id", "event_type", "event_display", "timestamp",
                  "description", "is_flagged", "doctor_name"]

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name() if obj.doctor else None
