from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display   = ["timestamp", "user", "action", "resource_type", "resource_id", "ip_address"]
    list_filter    = ["action", "resource_type"]
    search_fields  = ["user__email", "resource_type", "description"]
    date_hierarchy = "timestamp"
    readonly_fields = ["user", "action", "resource_type", "resource_id",
                       "timestamp", "ip_address", "changes", "description"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
