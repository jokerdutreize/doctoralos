from django.conf import settings
from django.db import models


class Appointment(models.Model):
    STATUS_CHOICES = [
        ("scheduled",  "Scheduled"),
        ("completed",  "Completed"),
        ("cancelled",  "Cancelled"),
        ("no_show",    "No Show"),
        ("rescheduled","Rescheduled"),
    ]
    TYPE_CHOICES = [
        ("outpatient", "Outpatient Visit"),
        ("labs",       "Laboratory"),
        ("imaging",    "Imaging"),
        ("biopsy",     "Biopsy"),
        ("mdt",        "MDT Review"),
        ("followup",   "Follow-up"),
        ("emergency",  "Emergency"),
    ]

    patient      = models.ForeignKey("patients.Patient", on_delete=models.CASCADE,
                                     related_name="appointments")
    doctor       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                     null=True, related_name="appointments")
    department   = models.ForeignKey("organizations.Department", on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name="appointments")
    scheduled_at = models.DateTimeField(db_index=True)
    type         = models.CharField(max_length=15, choices=TYPE_CHOICES, default="outpatient")
    status       = models.CharField(max_length=15, choices=STATUS_CHOICES, default="scheduled")
    notes        = models.TextField(blank=True)
    linked_event = models.ForeignKey("clinical.ClinicalEvent", on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name="appointment")
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_at"]
        indexes  = [
            models.Index(fields=["doctor", "scheduled_at"]),
            models.Index(fields=["patient", "scheduled_at"]),
            models.Index(fields=["status"]),
        ]
        verbose_name = "Appointment"

    def __str__(self):
        return f"{self.patient.name} w/ {self.doctor} @ {self.scheduled_at:%Y-%m-%d %H:%M}"
