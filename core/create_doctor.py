import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import Doctor

if not Doctor.objects.filter(email="admin@hospital.com").exists():
    d = Doctor(
        email="admin@hospital.com",
        first_name="Sarah",
        last_name="Chen",
        hospital="University Medical Center",
        department="Hepatobiliary Surgery",
        specialty="Liver Transplantation",
        role="administrator",
    )
    d.set_password("admin1234")
    d.save()
    print("Created:", d)
else:
    print("Already exists.")

# Seed a second doctor
if not Doctor.objects.filter(email="dr.martin@hospital.com").exists():
    d2 = Doctor(
        email="dr.martin@hospital.com",
        first_name="James",
        last_name="Martin",
        hospital="University Medical Center",
        department="Hepatology",
        specialty="Hepatology & Liver Disease",
        role="hepatologist",
    )
    d2.set_password("doctor1234")
    d2.save()
    print("Created:", d2)
