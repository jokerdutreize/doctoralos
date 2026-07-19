from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("patients", "0002_add_slt_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="transplant_program",
            field=models.CharField(
                choices=[
                    ("WHOLE_LIVER",  "Whole Liver Transplant"),
                    ("SPLIT_LIVER",  "Split Liver Transplant"),
                    ("LDLT",         "Living Donor Liver Transplant"),
                    ("PEDIATRIC",    "Pediatric Liver Transplant"),
                    ("RETRANSPLANT", "Re-transplantation"),
                    ("AUXILIARY",    "Auxiliary Liver Transplant"),
                    ("DOMINO",       "Domino Liver Transplant"),
                ],
                default="WHOLE_LIVER",
                db_index=True,
                max_length=20,
                verbose_name="Transplant Program",
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="graft_type",
            field=models.CharField(
                choices=[
                    ("WHOLE",          "Whole Liver"),
                    ("LEFT_LOBE",      "Left Lobe"),
                    ("RIGHT_LOBE",     "Right Lobe"),
                    ("LEFT_LATERAL",   "Left Lateral Segment"),
                    ("EXTENDED_RIGHT", "Extended Right Lobe"),
                    ("UNKNOWN",        "Unspecified"),
                ],
                default="WHOLE",
                db_index=True,
                max_length=20,
                verbose_name="Graft Type",
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="donor_type",
            field=models.CharField(
                choices=[
                    ("LIVING",   "Living Donor"),
                    ("DECEASED", "Deceased Donor"),
                    ("UNKNOWN",  "Unknown"),
                ],
                default="UNKNOWN",
                db_index=True,
                max_length=10,
                verbose_name="Donor Type",
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="graft_weight",
            field=models.FloatField(blank=True, null=True, verbose_name="Graft weight (g)"),
        ),
        migrations.AddField(
            model_name="patient",
            name="recipient_weight",
            field=models.FloatField(blank=True, null=True, verbose_name="Recipient weight (kg)"),
        ),
        migrations.AddField(
            model_name="patient",
            name="grwr",
            field=models.FloatField(blank=True, null=True, verbose_name="Graft-to-Recipient Weight Ratio (%)"),
        ),
        migrations.AddField(
            model_name="patient",
            name="graft_volume",
            field=models.FloatField(blank=True, null=True, verbose_name="Graft volume (mL)"),
        ),
        migrations.AddField(
            model_name="patient",
            name="estimated_regeneration",
            field=models.FloatField(blank=True, null=True, verbose_name="Estimated liver regeneration (%)"),
        ),
        migrations.AddField(
            model_name="patient",
            name="surgeon",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="patient",
            name="surgical_team",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="patient",
            name="transplant_center",
            field=models.CharField(blank=True, max_length=120),
        ),
    ]
