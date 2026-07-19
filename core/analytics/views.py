"""
Analytics views — hospital-wide stats and doctor personal dashboard.
"""
from django.db.models import Count, Avg, Q
from django.db.models.functions import ExtractYear
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.authentication import UserJWTAuthentication
from patients.models import Patient


# ── Doctor personal dashboard ─────────────────────────────────────────────────

@api_view(["GET"])
@authentication_classes([UserJWTAuthentication])
@permission_classes([IsAuthenticated])
def doctor_dashboard(request):
    """
    GET /api/analytics/me/
    Returns stats personalized to the authenticated doctor.
    """
    user = request.user

    # Assigned patients — doctors see theirs; admins/researchers see all
    if user.role == "doctor":
        assigned_qs = Patient.objects.filter(primary_doctor=user)
    else:
        assigned_qs = Patient.objects.all()

    all_qs = Patient.objects.all()
    today  = timezone.now().date()

    # Critical patients (CP-C or MELD ≥ 25)
    critical_qs = assigned_qs.filter(
        Q(child_pugh_category="C") | Q(meld_score__gte=25)
    ).order_by("-meld_score", "-child_pugh_score")

    critical_patients = [
        {
            "id":                p.id,
            "patient_id":        p.patient_id,
            "name":              p.name,
            "age":               p.age,
            "meld_score":        p.meld_score,
            "child_pugh":        p.child_pugh_category,
            "status":            p.status,
            "transplant_program": p.transplant_program,
            "graft_type":        p.graft_type,
            "donor_type":        p.donor_type,
        }
        for p in critical_qs[:8]
    ]

    # Today's appointments (real table if populated, else 0)
    today_appointments = 0
    upcoming_appointments = []
    try:
        from appointments.models import Appointment
        today_appts_qs = Appointment.objects.filter(
            scheduled_at__date=today,
            status="scheduled",
        )
        if user.role == "doctor":
            today_appts_qs = today_appts_qs.filter(doctor=user)
        today_appointments = today_appts_qs.count()
        upcoming_appointments = [
            {
                "id":         a.id,
                "patient":    a.patient.name,
                "patient_id": a.patient.patient_id,
                "type":       a.get_type_display(),
                "time":       a.scheduled_at.strftime("%H:%M"),
                "status":     a.status,
            }
            for a in today_appts_qs.select_related("patient")[:6]
        ]
    except Exception:
        pass

    # Recent clinical alerts from notifications
    recent_alerts = []
    try:
        from notifications.models import Notification
        alert_qs = Notification.objects.filter(
            is_read=False,
            priority__in=["critical", "high"],
        ).order_by("-created_at")[:5]
        recent_alerts = [
            {
                "id":       n.id,
                "title":    n.title,
                "message":  n.message,
                "priority": n.priority,
                "patient":  n.patient_name,
                "time":     n.created_at.isoformat(),
            }
            for n in alert_qs
        ]
    except Exception:
        pass

    # Aggregate metrics
    agg = assigned_qs.aggregate(
        avg_meld=Avg("meld_score"),
        avg_age=Avg("age"),
        avg_grwr=Avg("grwr"),
        avg_regen=Avg("estimated_regeneration"),
    )

    # Transplant program breakdown
    wlt_count      = assigned_qs.filter(transplant_program="WHOLE_LIVER").count()
    slt_count      = assigned_qs.filter(transplant_program="SPLIT_LIVER").count()
    living_count   = assigned_qs.filter(donor_type="LIVING").count()
    deceased_count = assigned_qs.filter(donor_type="DECEASED").count()

    return Response({
        "doctor": {
            "name":       user.get_full_name(),
            "role":       user.role,
            "email":      user.email,
            "specialty":  getattr(getattr(user, "doctor_profile", None), "specialty", ""),
            "department": getattr(getattr(user, "doctor_profile", None), "department", ""),
            "hospital":   getattr(getattr(user, "doctor_profile", None), "hospital", ""),
        },
        "stats": {
            "assigned_patients":    assigned_qs.count(),
            "alive_patients":       assigned_qs.filter(status="Alive").count(),
            "critical_patients":    critical_qs.count(),
            "today_appointments":   today_appointments,
            "pending_reviews":      critical_qs.filter(status="Alive").count(),
            "avg_meld":             round(agg["avg_meld"] or 0, 1),
            "avg_age":              round(agg["avg_age"] or 0, 1),
            "total_cohort":         all_qs.count(),
            "whole_liver_count":    wlt_count,
            "split_liver_count":    slt_count,
            "living_donor_count":   living_count,
            "deceased_donor_count": deceased_count,
            "avg_grwr":             round(agg["avg_grwr"] or 0, 2),
            "avg_regeneration":     round(agg["avg_regen"] or 0, 1),
        },
        "critical_patients":  critical_patients,
        "today_appointments": upcoming_appointments,
        "recent_alerts":      recent_alerts,
    })


# ── Hospital-wide analytics ───────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def hospital_stats(request):
    qs    = Patient.objects.all()
    total = qs.count()

    if total == 0:
        return Response(_empty_response())

    alive    = qs.filter(status="Alive").count()
    deceased = qs.filter(status="Dead").count()
    high_risk = qs.filter(Q(child_pugh_category="C") | Q(meld_score__gte=25)).count()
    critical  = qs.filter(Q(child_pugh_category="C") | Q(meld_score__gte=30)).count()

    cp_a = qs.filter(child_pugh_category="A").count()
    cp_b = qs.filter(child_pugh_category="B").count()
    cp_c = qs.filter(child_pugh_category="C").count()

    agg = qs.aggregate(avg_meld=Avg("meld_score"), avg_age=Avg("age"))
    avg_meld      = round(agg["avg_meld"] or 0, 1)
    avg_age       = round(agg["avg_age"] or 0, 1)
    survival_rate = round((alive / total) * 100, 1) if total else 0

    male   = qs.filter(sex=1).count()
    female = qs.filter(sex=2).count()

    # Transplant program breakdown
    wlt_count      = qs.filter(transplant_program="WHOLE_LIVER").count()
    slt_count      = qs.filter(transplant_program="SPLIT_LIVER").count()
    living_count   = qs.filter(donor_type="LIVING").count()
    deceased_count = qs.filter(donor_type="DECEASED").count()

    # Graft type breakdown (for SLT)
    graft_counts = {}
    for code, label in [
        ("WHOLE", "Whole"),
        ("LEFT_LOBE", "Left Lobe"),
        ("RIGHT_LOBE", "Right Lobe"),
        ("LEFT_LATERAL", "Left Lateral"),
        ("EXTENDED_RIGHT", "Extended Right"),
        ("UNKNOWN", "Unspecified"),
    ]:
        n = qs.filter(graft_type=code).count()
        if n > 0:
            graft_counts[code] = {"label": label, "value": n}

    age_groups = [
        {"label": label, "count": qs.filter(age__gte=lo, age__lt=hi).count()}
        for label, lo, hi in [
            ("<30", 0, 30), ("30–39", 30, 40), ("40–49", 40, 50),
            ("50–59", 50, 60), ("60–69", 60, 70), ("≥70", 70, 200),
        ]
    ]

    meld_groups = [
        {"label": label, "count": qs.filter(meld_score__gte=lo, meld_score__lt=hi).count()}
        for label, lo, hi in [
            ("<10", 0, 10), ("10–14", 10, 15), ("15–19", 15, 20),
            ("20–24", 20, 25), ("25–29", 25, 30), ("≥30", 30, 100),
        ]
    ]

    ops_by_year = list(
        qs.filter(operation_date__isnull=False)
        .annotate(year=ExtractYear("operation_date"))
        .values("year")
        .annotate(count=Count("id"))
        .order_by("year")
    )

    # Ops by year split by transplant program
    wlt_by_year_qs = (
        qs.filter(operation_date__isnull=False, transplant_program="WHOLE_LIVER")
        .annotate(year=ExtractYear("operation_date"))
        .values("year")
        .annotate(wlt=Count("id"))
    )
    slt_by_year_qs = (
        qs.filter(operation_date__isnull=False, transplant_program="SPLIT_LIVER")
        .annotate(year=ExtractYear("operation_date"))
        .values("year")
        .annotate(slt=Count("id"))
    )
    wlt_by_year = {r["year"]: r["wlt"] for r in wlt_by_year_qs}
    slt_by_year = {r["year"]: r["slt"] for r in slt_by_year_qs}

    ops_by_year_split = [
        {"year": r["year"], "count": r["count"],
         "wlt": wlt_by_year.get(r["year"], 0),
         "slt": slt_by_year.get(r["year"], 0)}
        for r in ops_by_year
    ]

    survival_by_year = []
    for entry in ops_by_year:
        yr    = entry["year"]
        yr_qs = qs.filter(operation_date__year=yr)
        yr_total = yr_qs.count()
        yr_alive  = yr_qs.filter(status="Alive").count()
        survival_by_year.append({
            "year":  yr,
            "rate":  round((yr_alive / yr_total * 100) if yr_total else 0, 1),
            "total": yr_total,
            "alive": yr_alive,
        })

    recent   = list(qs.order_by("-created_at")[:12])
    activity = _build_activity(recent)

    return Response({
        "kpis": {
            "total_patients":       total,
            "alive_patients":       alive,
            "deceased_patients":    deceased,
            "high_risk":            high_risk,
            "critical":             critical,
            "survival_rate":        survival_rate,
            "avg_meld":             avg_meld,
            "avg_age":              avg_age,
            "whole_liver_count":    wlt_count,
            "split_liver_count":    slt_count,
            "living_donor_count":   living_count,
            "deceased_donor_count": deceased_count,
        },
        "distributions": {
            "sex": [
                {"label": "Male",   "value": male,   "fill": "#1565C0"},
                {"label": "Female", "value": female, "fill": "#7B1FA2"},
            ],
            "child_pugh": [
                {"label": "Class A", "value": cp_a, "fill": "#2E7D32"},
                {"label": "Class B", "value": cp_b, "fill": "#E65100"},
                {"label": "Class C", "value": cp_c, "fill": "#B71C1C"},
            ],
            "outcome": [
                {"label": "Alive",    "value": alive,    "fill": "#2E7D32"},
                {"label": "Deceased", "value": deceased, "fill": "#B71C1C"},
            ],
            "transplant_program": [
                {"label": "Whole Liver",  "value": wlt_count,      "fill": "#059669"},
                {"label": "Split Liver",  "value": slt_count,      "fill": "#1565C0"},
            ],
            "donor_type": [
                {"label": "Living Donor",   "value": living_count,   "fill": "#7C3AED"},
                {"label": "Deceased Donor", "value": deceased_count, "fill": "#0891B2"},
                {"label": "Unknown",        "value": total - living_count - deceased_count, "fill": "#9CA3AF"},
            ],
            "age_groups":  age_groups,
            "meld_groups": meld_groups,
        },
        "temporal": {
            "ops_by_year":       ops_by_year_split,
            "survival_by_year":  survival_by_year,
        },
        "recent_activity": activity,
    })


def _build_activity(patients: list) -> list:
    TEMPLATES = [
        ("registration", "Patient {} registered",         "user-plus"),
        ("lab",          "Lab results received for {}",   "flask"),
        ("risk",         "AI risk assessment for {}",     "activity"),
        ("critical",     "Critical flag raised for {}",   "alert-triangle"),
        ("follow_up",    "Follow-up scheduled for {}",    "calendar"),
    ]
    items = []
    for i, p in enumerate(patients):
        tpl = TEMPLATES[i % len(TEMPLATES)]
        a_type, a_title, a_icon = tpl
        if p.meld_score and p.meld_score >= 30:
            a_type, a_title, a_icon = "critical", "Critical — MELD ≥ 30 for {}", "alert-triangle"
        elif p.status == "Dead":
            a_type, a_title, a_icon = "outcome", "Outcome recorded for {}", "activity"
        elif i % 3 == 0:
            a_type, a_title, a_icon = "lab", "Lab panel completed for {}", "flask"
        items.append({
            "type":               a_type,
            "title":              a_title.format(p.name),
            "subtitle":           f"{p.patient_id} · MELD {p.meld_score:.0f}" if p.meld_score else p.patient_id,
            "timestamp":          p.created_at.isoformat(),
            "icon":               a_icon,
            "transplant_program": p.transplant_program,
        })
    return items


def _empty_response() -> dict:
    return {
        "kpis": {k: 0 for k in [
            "total_patients", "alive_patients", "deceased_patients",
            "high_risk", "critical", "survival_rate", "avg_meld", "avg_age",
            "whole_liver_count", "split_liver_count", "living_donor_count", "deceased_donor_count",
        ]},
        "distributions": {
            "sex": [], "child_pugh": [], "outcome": [],
            "transplant_program": [], "donor_type": [],
            "age_groups": [], "meld_groups": [],
        },
        "temporal":       {"ops_by_year": [], "survival_by_year": []},
        "recent_activity": [],
    }
