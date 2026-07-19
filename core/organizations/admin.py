from django.contrib import admin
from .models import Hospital, Department, Ward, Bed


class DepartmentInline(admin.TabularInline):
    model  = Department
    extra  = 0
    fields = ["name", "code", "head_doctor"]


class WardInline(admin.TabularInline):
    model  = Ward
    extra  = 0
    fields = ["name", "capacity"]


@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display  = ["name", "city", "license_number"]
    search_fields = ["name", "city"]
    inlines       = [DepartmentInline]


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display  = ["name", "code", "hospital", "head_doctor"]
    list_filter   = ["hospital"]
    search_fields = ["name", "code"]
    inlines       = [WardInline]


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display  = ["name", "department", "capacity"]
    list_filter   = ["department__hospital"]


@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):
    list_display  = ["number", "ward", "status"]
    list_filter   = ["status", "ward__department"]
