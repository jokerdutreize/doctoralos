from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "type", "priority", "title", "message",
            "patient_db_id", "patient_name", "is_read", "created_at",
        ]
