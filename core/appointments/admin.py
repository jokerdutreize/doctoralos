from django.contrib import admin
from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display   = ["patient", "doctor", "type", "status", "scheduled_at", "department"]
    list_filter    = ["status", "type", "department"]
    search_fields  = ["patient__name", "patient__patient_id", "doctor__email"]
    date_hierarchy = "scheduled_at"
    ordering       = ["scheduled_at"]
