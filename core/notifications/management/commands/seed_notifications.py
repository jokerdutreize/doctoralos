"""
Generate realistic notifications from existing patients.
Usage: python manage.py seed_notifications
       python manage.py seed_notifications --clear
"""
from datetime import timedelta
import random

from django.core.management.base import BaseCommand
from django.utils import timezone

from notifications.models import Notification
from patients.models import Patient


class Command(BaseCommand):
    help = "Seed notifications from existing patient data"

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Clear existing notifications first")

    def handle(self, *args, **options):
        if options["clear"]:
            Notification.objects.all().delete()
            self.stdout.write("Cleared existing notifications.")

        if Notification.objects.exists():
            self.stdout.write("Notifications already seeded. Use --clear to re-seed.")
            return

        patients = list(Patient.objects.all())
        now = timezone.now()
        created = 0

        # System notification
        Notification.objects.create(
            type="system",
            priority="low",
            title="Digital Twin Platform Online",
            message="All monitoring systems are operational. Clinical AI services running.",
            created_at=now - timedelta(hours=2),
        )
        created += 1

        # Critical patient alerts
        critical = [p for p in patients if p.child_pugh_category == "C" or (p.meld_score and p.meld_score >= 28)]
        for i, p in enumerate(critical[:5]):
            meld = round(p.meld_score, 1) if p.meld_score else "N/A"
            cp = p.child_pugh_category or "?"
            Notification.objects.create(
                type="critical_patient",
                priority="critical" if (p.child_pugh_category == "C" and p.meld_score and p.meld_score >= 30) else "high",
                title=f"Critical Status: {p.name}",
                message=(
                    f"Patient {p.patient_id} requires immediate review. "
                    f"MELD score: {meld}, Child-Pugh class: {cp}. "
                    f"Please assess graft function and immunosuppression levels."
                ),
                patient_db_id=p.id,
                patient_name=p.name,
                created_at=now - timedelta(hours=random.randint(1, 12)),
            )
            created += 1

        # Lab alerts — high bilirubin / ALT
        rng = random.Random(42)
        lab_patients = rng.sample(patients, min(4, len(patients)))
        lab_templates = [
            ("Elevated ALT", "lab_alert", "high",
             "ALT level exceeds 3× ULN. Possible hepatocellular injury or rejection episode. Repeat LFTs in 48 h."),
            ("High Bilirubin", "lab_alert", "high",
             "Total bilirubin > 3 mg/dL at latest timepoint. Consider biliary complication or rejection."),
            ("INR Elevation", "lab_alert", "medium",
             "INR elevated above reference range. Monitor coagulation; review tacrolimus trough."),
            ("Low Tacrolimus Trough", "medication_alert", "high",
             "Tacrolimus trough level below therapeutic range (< 5 ng/mL). Risk of acute rejection. Dose adjustment recommended."),
        ]
        for p, (title, ntype, priority, msg) in zip(lab_patients, lab_templates):
            Notification.objects.create(
                type=ntype,
                priority=priority,
                title=f"{title}: {p.name}",
                message=msg,
                patient_db_id=p.id,
                patient_name=p.name,
                created_at=now - timedelta(hours=random.randint(3, 36)),
            )
            created += 1

        # Medication alert — tacrolimus
        tac_patients = rng.sample(patients, min(2, len(patients)))
        for p in tac_patients:
            Notification.objects.create(
                type="medication_alert",
                priority="medium",
                title=f"Medication Review Due: {p.name}",
                message=(
                    "Scheduled 3-month immunosuppression review. "
                    "Check tacrolimus trough, CBC, creatinine before adjustment."
                ),
                patient_db_id=p.id,
                patient_name=p.name,
                created_at=now - timedelta(hours=random.randint(6, 48)),
            )
            created += 1

        # Info — weekly report
        Notification.objects.create(
            type="info",
            priority="low",
            title="Weekly Cohort Report Ready",
            message="The weekly transplant cohort summary for the WLT dataset is available in the Research dashboard.",
            created_at=now - timedelta(hours=20),
        )
        created += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} notifications."))
