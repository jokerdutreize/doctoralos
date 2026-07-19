from rest_framework import serializers
from .models import User, DoctorProfile


class DoctorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DoctorProfile
        fields = ["specialty", "license_number", "hospital", "department"]


class UserSerializer(serializers.ModelSerializer):
    full_name      = serializers.SerializerMethodField()
    doctor_profile = DoctorProfileSerializer(read_only=True)

    class Meta:
        model  = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "role", "is_active", "last_login", "created_at",
            "doctor_profile",
        ]
        read_only_fields = ["id", "last_login", "created_at"]

    def get_full_name(self, obj: User) -> str:
        return obj.get_full_name()


class UserUpdateSerializer(serializers.ModelSerializer):
    specialty  = serializers.CharField(write_only=True, required=False, allow_blank=True)
    hospital   = serializers.CharField(write_only=True, required=False, allow_blank=True)
    department = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model  = User
        fields = ["first_name", "last_name", "specialty", "hospital", "department"]

    def update(self, instance, validated_data):
        profile_fields = {k: validated_data.pop(k)
                         for k in ["specialty", "hospital", "department"]
                         if k in validated_data}
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if profile_fields:
            profile, _ = DoctorProfile.objects.get_or_create(user=instance)
            for attr, val in profile_fields.items():
                setattr(profile, attr, val)
            profile.save()
        return instance


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password     = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError("Passwords do not match.")
        return data
