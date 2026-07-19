"""
Data migration: populate transplant_program + graft_type from legacy transplant_type.

WLT → WHOLE_LIVER / graft_type=WHOLE   / donor_type=UNKNOWN
SLT → SPLIT_LIVER / graft_type=UNKNOWN / donor_type=UNKNOWN
"""
from django.db import migrations


def populate(apps, schema_editor):
    Patient = apps.get_model("patients", "Patient")
    updates = []
    for p in Patient.objects.only("id", "transplant_type",
                                  "transplant_program", "graft_type", "donor_type"):
        if p.transplant_type == "SLT":
            p.transplant_program = "SPLIT_LIVER"
            p.graft_type         = "UNKNOWN"
        else:
            p.transplant_program = "WHOLE_LIVER"
            p.graft_type         = "WHOLE"
        p.donor_type = "UNKNOWN"
        updates.append(p)

    # Bulk update in batches of 500 for performance
    for i in range(0, len(updates), 500):
        Patient.objects.bulk_update(
            updates[i:i + 500],
            ["transplant_program", "graft_type", "donor_type"],
        )


def reverse_populate(apps, schema_editor):
    pass  # irreversible — legacy field still intact


class Migration(migrations.Migration):

    dependencies = [
        ("patients", "0003_add_transplant_program"),
    ]

    operations = [
        migrations.RunPython(populate, reverse_populate),
    ]
