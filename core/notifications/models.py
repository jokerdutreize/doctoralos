from django.db import models


class Notification(models.Model):
    TYPES = [
        ("critical_patient", "Critical Patient"),
        ("lab_alert", "Lab Alert"),
        ("medication_alert", "Medication Alert"),
        ("system", "System"),
        ("info", "Info"),
    ]
    PRIORITIES = [
        ("critical", "Critical"),
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
    ]

    type = models.CharField(max_length=30, choices=TYPES)
    priority = models.CharField(max_length=10, choices=PRIORITIES, default="medium")
    title = models.CharField(max_length=200)
    message = models.TextField()
    patient_db_id = models.IntegerField(null=True, blank=True)
    patient_name = models.CharField(max_length=150, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.priority.upper()}] {self.title}"
