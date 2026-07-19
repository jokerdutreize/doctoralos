from rest_framework import serializers
from .models import Hospital, Department, Ward, Bed


class BedSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Bed
        fields = ["id", "number", "status"]


class WardSerializer(serializers.ModelSerializer):
    beds = BedSerializer(many=True, read_only=True)

    class Meta:
        model  = Ward
        fields = ["id", "name", "capacity", "beds"]


class DepartmentSerializer(serializers.ModelSerializer):
    hospital_name = serializers.CharField(source="hospital.name", read_only=True)

    class Meta:
        model  = Department
        fields = ["id", "name", "code", "hospital", "hospital_name"]


class HospitalSerializer(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)

    class Meta:
        model  = Hospital
        fields = ["id", "name", "city", "address", "phone", "departments"]
