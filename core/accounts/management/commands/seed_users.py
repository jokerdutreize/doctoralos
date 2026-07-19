"""
Seed default users for development.

Usage:
    python manage.py seed_users
    python manage.py seed_users --clear
"""
from django.core.management.base import BaseCommand
from accounts.models import User, DoctorProfile


USERS = [
    {
        "email":      "admin@hospital.com",
        "password":   "admin1234",
        "first_name": "Admin",
        "last_name":  "User",
        "role":       "admin",
        "is_staff":   True,
        "is_superuser": True,
        "profile": None,
    },
    {
        "email":      "dr.chen@hospital.com",
        "password":   "doctor1234",
        "first_name": "Wei",
        "last_name":  "Chen",
        "role":       "doctor",
        "is_staff":   False,
        "is_superuser": False,
        "profile": {
            "specialty":      "Transplant Hepatology",
            "license_number": "MD-TC-00142",
            "hospital":       "University Transplant Center",
            "department":     "Hepatology",
        },
    },
    {
        "email":      "dr.martin@hospital.com",
        "password":   "doctor1234",
        "first_name": "Sophie",
        "last_name":  "Martin",
        "role":       "doctor",
        "is_staff":   False,
        "is_superuser": False,
        "profile": {
            "specialty":      "Transplant Surgery",
            "license_number": "MD-TS-00389",
            "hospital":       "University Transplant Center",
            "department":     "Surgery",
        },
    },
    {
        "email":      "nurse.lee@hospital.com",
        "password":   "nurse1234",
        "first_name": "Ji-Young",
        "last_name":  "Lee",
        "role":       "nurse",
        "is_staff":   False,
        "is_superuser": False,
        "profile": None,
    },
    {
        "email":      "researcher@hospital.com",
        "password":   "research1234",
        "first_name": "Amir",
        "last_name":  "Hassan",
        "role":       "researcher",
        "is_staff":   False,
        "is_superuser": False,
        "profile": None,
    },
]


class Command(BaseCommand):
    help = "Seed default users for development"

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true",
                            help="Delete all users before seeding")

    def handle(self, *args, **options):
        if options["clear"]:
            count = User.objects.count()
            User.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {count} users."))

        created = updated = 0
        for data in USERS:
            profile_data = data.pop("profile")
            password     = data.pop("password")

            user, is_new = User.objects.update_or_create(
                email=data["email"],
                defaults={k: v for k, v in data.items()},
            )
            user.set_password(password)
            user.save()

            if profile_data:
                DoctorProfile.objects.update_or_create(
                    user=user, defaults=profile_data
                )

            if is_new:
                created += 1
                self.stdout.write(f"  Created  {user.email}  ({user.role})")
            else:
                updated += 1
                self.stdout.write(f"  Updated  {user.email}  ({user.role})")

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. Created: {created}  Updated: {updated}"
        ))
        self.stdout.write("\nCredentials:")
        self.stdout.write("  admin@hospital.com    / admin1234    (admin)")
        self.stdout.write("  dr.chen@hospital.com  / doctor1234   (doctor)")
        self.stdout.write("  dr.martin@hospital.com / doctor1234  (doctor)")
