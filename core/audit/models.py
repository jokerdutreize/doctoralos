from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ("CREATE", "Create"),
        ("READ",   "Read"),
        ("UPDATE", "Update"),
        ("DELETE", "Delete"),
        ("LOGIN",  "Login"),
        ("LOGOUT", "Logout"),
        ("EXPORT", "Export"),
    ]

    user          = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                      null=True, blank=True, related_name="audit_logs")
    action        = models.CharField(max_length=10, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=60)
    resource_id   = models.CharField(max_length=40, blank=True)
    timestamp     = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address    = models.GenericIPAddressField(null=True, blank=True)
    changes       = models.JSONField(default=dict, blank=True)
    description   = models.TextField(blank=True)

    class Meta:
        ordering     = ["-timestamp"]
        verbose_name = "Audit Log"
        indexes      = [
            models.Index(fields=["user", "timestamp"]),
            models.Index(fields=["resource_type", "resource_id"]),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else "system"
        return f"[{self.action}] {self.resource_type} by {user_str} @ {self.timestamp:%Y-%m-%d %H:%M}"
