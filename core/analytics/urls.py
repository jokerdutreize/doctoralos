from django.urls import path
from .views import hospital_stats, doctor_dashboard

urlpatterns = [
    path("hospital/", hospital_stats,    name="analytics-hospital"),
    path("me/",       doctor_dashboard,  name="analytics-me"),
]
