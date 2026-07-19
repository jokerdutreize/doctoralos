from django.contrib import admin
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display  = ["patient_id", "name", "sex_display", "age", "status",
                     "operation_date", "meld_score", "child_pugh_category"]
    list_filter   = ["status", "sex", "child_pugh_category"]
    search_fields = ["patient_id", "name"]
    ordering      = ["patient_id"]
    readonly_fields = ["created_at", "updated_at"]
