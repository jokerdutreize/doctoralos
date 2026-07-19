"""
Management command: export_training_data
==========================================
Exports a flat CSV of patient features + mortality outcome for training the
predictive mortality-risk model in ml-service/.

Only patients with a known `status` are included — status is currently the
only reliably populated outcome signal (rejection_episode is unpopulated for
all 296 PatientTimepoint rows). `status == 'Dead'` becomes event=1; all other
known statuses (Alive/Inpatient/Outpatient/Discharged) become event=0. This is
a point-in-time outcome as recorded, not a fixed-horizon mortality prediction.

Usage (from core/ directory with venv active):
    python manage.py export_training_data
    python manage.py export_training_data --output path/to/file.csv
"""
import csv
import os
from django.core.management.base import BaseCommand
from patients.models import Patient

DEFAULT_OUTPUT = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "..",
    "ml-service", "data", "patients_training.csv",
)

FIELDS = ["patient_id", "meld_score", "child_pugh_score", "cold_ischemia_time", "age", "event"]


def _row(patient: Patient) -> dict:
    return {
        "patient_id":          patient.patient_id,
        "meld_score":          patient.meld_score,
        "child_pugh_score":    patient.child_pugh_score,
        "cold_ischemia_time":  patient.cold_ischemia_time,
        "age":                 patient.age,
        "event":               1 if patient.status == "Dead" else 0,
    }


class Command(BaseCommand):
    help = "Export patient features + mortality outcome CSV for ml-service training"

    def add_arguments(self, parser):
        parser.add_argument(
            "--output", default=DEFAULT_OUTPUT,
            help="Output CSV path (default: ml-service/data/patients_training.csv)",
        )

    def handle(self, *args, **options):
        output_path = os.path.abspath(options["output"])
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        queryset = Patient.objects.exclude(status="").exclude(status__isnull=True)

        written = skipped = 0
        with open(output_path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=FIELDS)
            writer.writeheader()
            for patient in queryset.iterator():
                if patient.meld_score is None:
                    skipped += 1
                    continue
                writer.writerow(_row(patient))
                written += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. Written: {written}  Skipped (no MELD score): {skipped}"
            f"\nOutput: {output_path}"
        ))
