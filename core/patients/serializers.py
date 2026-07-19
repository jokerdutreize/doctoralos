from rest_framework import serializers
from .models import Patient, PatientTimepoint


class PatientTimepointSerializer(serializers.ModelSerializer):
    timepoint_label = serializers.CharField(source="get_timepoint_display", read_only=True)

    class Meta:
        model   = PatientTimepoint
        exclude = ["patient"]


class PatientListSerializer(serializers.ModelSerializer):
    """Compact — used in list, search, and global search results."""
    sex_display         = serializers.ReadOnlyField()
    is_critical         = serializers.ReadOnlyField()
    primary_doctor_name = serializers.SerializerMethodField()

    class Meta:
        model  = Patient
        fields = [
            "id", "patient_id", "mrn", "name", "sex", "sex_display",
            "age", "status", "operation_date",
            "hospitalization_number",
            "bmi", "meld_score", "child_pugh_score", "child_pugh_category",
            "cold_ischemia_time", "icu_days",
            # Transplant program (new architecture)
            "transplant_program", "graft_type", "donor_type",
            "grwr", "estimated_regeneration",
            # Legacy
            "transplant_type",
            "primary_doctor", "primary_doctor_name",
            "department", "is_critical",
        ]

    def get_primary_doctor_name(self, obj):
        if obj.primary_doctor:
            return obj.primary_doctor.get_full_name()
        return None


class PatientDetailSerializer(serializers.ModelSerializer):
    """Full serializer — includes timepoints and doctor name."""
    sex_display         = serializers.ReadOnlyField()
    is_critical         = serializers.ReadOnlyField()
    timepoints          = PatientTimepointSerializer(many=True, read_only=True)
    primary_doctor_name = serializers.SerializerMethodField()
    department_name     = serializers.SerializerMethodField()

    class Meta:
        model  = Patient
        fields = "__all__"

    def get_primary_doctor_name(self, obj):
        if obj.primary_doctor:
            return obj.primary_doctor.get_full_name()
        return None

    def get_department_name(self, obj):
        if obj.department:
            return obj.department.name
        return None
