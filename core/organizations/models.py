from django.conf import settings
from django.db import models


class Hospital(models.Model):
    name            = models.CharField(max_length=200)
    address         = models.TextField(blank=True)
    city            = models.CharField(max_length=100, blank=True)
    phone           = models.CharField(max_length=30, blank=True)
    license_number  = models.CharField(max_length=60, blank=True, unique=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering     = ["name"]
        verbose_name = "Hospital"

    def __str__(self):
        return self.name


class Department(models.Model):
    hospital    = models.ForeignKey(Hospital, on_delete=models.CASCADE,
                                    related_name="departments")
    name        = models.CharField(max_length=120)
    code        = models.CharField(max_length=20, blank=True)
    head_doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="headed_departments",
    )

    class Meta:
        ordering            = ["name"]
        verbose_name        = "Department"
        unique_together     = ("hospital", "name")

    def __str__(self):
        return f"{self.hospital.name} — {self.name}"


class Ward(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE,
                                   related_name="wards")
    name       = models.CharField(max_length=80)
    capacity   = models.PositiveIntegerField(default=0)

    class Meta:
        ordering     = ["department", "name"]
        verbose_name = "Ward"

    def __str__(self):
        return f"{self.department.name} / {self.name}"


class Bed(models.Model):
    STATUS_CHOICES = [
        ("available",    "Available"),
        ("occupied",     "Occupied"),
        ("maintenance",  "Maintenance"),
    ]

    ward   = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name="beds")
    number = models.CharField(max_length=10)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="available")

    class Meta:
        ordering        = ["ward", "number"]
        verbose_name    = "Bed"
        unique_together = ("ward", "number")

    def __str__(self):
        return f"{self.ward} / Bed {self.number} ({self.status})"
