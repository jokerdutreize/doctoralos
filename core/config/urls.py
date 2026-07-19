from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/",               admin.site.urls),
    path("api/auth/",            include("accounts.urls")),
    path("api/patients/",        include("patients.urls")),
    path("api/analytics/",       include("analytics.urls")),
    path("api/notifications/",   include("notifications.urls")),
    path("api/organizations/",   include("organizations.urls")),
    path("api/clinical/",        include("clinical.urls")),
    path("api/appointments/",    include("appointments.urls")),
    path("api/audit/",           include("audit.urls")),
    path("api/predictions/",     include("predictions.urls")),
]
