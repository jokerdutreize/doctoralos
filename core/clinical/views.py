from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ClinicalEvent
from .serializers import ClinicalEventSerializer, ClinicalEventListSerializer


class ClinicalEventViewSet(viewsets.ModelViewSet):
    """
    GET  /api/clinical/events/           all events (filterable)
    GET  /api/clinical/events/:id/       single event with subtype
    POST /api/clinical/events/           create event (with subtype in body)
    GET  /api/clinical/events/patient/:pid/timeline/  patient timeline
    """
    queryset = ClinicalEvent.objects.select_related(
        "patient", "doctor",
        "lab_result", "diagnosis", "prescription",
        "imaging_study", "procedure", "clinical_note", "vitals",
    )
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields   = ["patient__patient_id", "patient__name", "description"]
    ordering_fields = ["timestamp", "event_type"]
    ordering        = ["-timestamp"]

    def get_serializer_class(self):
        if self.action == "list":
            return ClinicalEventListSerializer
        return ClinicalEventSerializer

    @action(detail=False, methods=["get"], url_path=r"patient/(?P<patient_id>[^/.]+)/timeline")
    def patient_timeline(self, request, patient_id=None):
        qs = self.queryset.filter(patient__patient_id=patient_id)
        event_type = request.query_params.get("type")
        if event_type:
            qs = qs.filter(event_type=event_type)
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(
                ClinicalEventSerializer(page, many=True).data
            )
        return Response(ClinicalEventSerializer(qs, many=True).data)
