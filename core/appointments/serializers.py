from rest_framework import serializers
from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name   = serializers.CharField(source="patient.name", read_only=True)
    patient_id_str = serializers.CharField(source="patient.patient_id", read_only=True)
    doctor_name    = serializers.SerializerMethodField()
    department_name = serializers.CharField(source="department.name", read_only=True, default=None)
    type_display   = serializers.CharField(source="get_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model  = Appointment
        fields = "__all__"

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name() if obj.doctor else None
