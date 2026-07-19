"""
Predictions views — real mortality-risk model inference, and honest
"insufficient data" responses for rejection/infection risk (no labeled
outcomes exist yet for either in the current dataset).
"""
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.authentication import UserJWTAuthentication
from patients.models import Patient
from . import model_loader


@api_view(["GET"])
@authentication_classes([UserJWTAuthentication])
@permission_classes([IsAuthenticated])
def mortality_risk(request, patient_id):
    """
    GET /api/predictions/patient/<id>/mortality-risk/
    Real logistic-regression mortality risk, trained on this cohort's own
    recorded outcomes (see ml-service/train.py). Exploratory pilot model —
    see model_info.caveat in the response.
    """
    patient = get_object_or_404(Patient, pk=patient_id)

    if not model_loader.model_available():
        return Response(
            {"available": False, "reason": "Mortality model artifact not found — run ml-service/train.py."},
            status=503,
        )

    result = model_loader.predict_mortality(patient)
    if result is None:
        return Response({
            "available": False,
            "reason": "Patient is missing required feature values (MELD score / cold ischemia time) for scoring.",
        })

    return Response({"available": True, **result})


@api_view(["GET"])
@authentication_classes([UserJWTAuthentication])
@permission_classes([IsAuthenticated])
def rejection_risk(request, patient_id):
    """
    GET /api/predictions/patient/<id>/rejection-risk/
    No labeled rejection outcomes exist in the current dataset
    (PatientTimepoint.rejection_episode is unpopulated for all 296 rows),
    so no model can be honestly trained yet.
    """
    get_object_or_404(Patient, pk=patient_id)
    return Response({
        "available": False,
        "reason": "No labeled rejection outcomes exist in the current dataset "
                  "(0 of 296 timepoints have rejection_episode recorded).",
    })


@api_view(["GET"])
@authentication_classes([UserJWTAuthentication])
@permission_classes([IsAuthenticated])
def infection_risk(request, patient_id):
    """
    GET /api/predictions/patient/<id>/infection-risk/
    No infection outcome field exists anywhere in the current schema,
    so no model can be honestly trained yet.
    """
    get_object_or_404(Patient, pk=patient_id)
    return Response({
        "available": False,
        "reason": "No infection outcome data exists in the current dataset.",
    })
