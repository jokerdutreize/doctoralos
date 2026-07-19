from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_email    = serializers.EmailField(source="user.email", read_only=True, default=None)
    user_name     = serializers.SerializerMethodField()
    action_display = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model   = AuditLog
        fields  = ["id", "user", "user_email", "user_name", "action", "action_display",
                   "resource_type", "resource_id", "timestamp", "ip_address",
                   "changes", "description"]
        read_only_fields = fields

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else "System"
