from django.db.models import Q
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Patient, PatientTimepoint
from .serializers import PatientListSerializer, PatientDetailSerializer, PatientTimepointSerializer
from .services.clinical_summary import generate_clinical_summary


class PatientViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/patients/                       paginated list
        ?search=      full-text search
        ?program=     WHOLE_LIVER | SPLIT_LIVER | LDLT | …
        ?donor=       LIVING | DECEASED
        ?graft=       WHOLE | LEFT_LOBE | RIGHT_LOBE | …
        ?risk=        critical | high
    GET /api/patients/{pk}/                  full patient detail
    GET /api/patients/search/?q=<term>       quick search (top 50)
    """
    queryset = Patient.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields   = ["patient_id", "name", "status", "child_pugh_category"]
    ordering_fields = ["patient_id", "name", "age", "operation_date",
                       "meld_score", "child_pugh_score"]
    ordering = ["patient_id"]

    def get_queryset(self):
        qs = Patient.objects.all()
        params = self.request.query_params

        program = params.get("program")
        if program:
            qs = qs.filter(transplant_program=program)

        donor = params.get("donor")
        if donor:
            qs = qs.filter(donor_type=donor)

        graft = params.get("graft")
        if graft:
            qs = qs.filter(graft_type=graft)

        risk = params.get("risk")
        if risk == "critical":
            qs = qs.filter(Q(child_pugh_category="C") | Q(meld_score__gte=30))
        elif risk == "high":
            qs = qs.filter(Q(child_pugh_category="C") | Q(meld_score__gte=25))

        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PatientDetailSerializer
        return PatientListSerializer

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request):
        """Quick search: /api/patients/search/?q=garcia"""
        q  = request.query_params.get("q", "").strip()
        qs = Patient.objects.all()
        if q:
            qs = qs.filter(
                Q(name__icontains=q)            |
                Q(patient_id__icontains=q)      |
                Q(status__iexact=q)             |
                Q(child_pugh_category__iexact=q)
            )
        results = qs[:50]
        return Response({
            "results": PatientListSerializer(results, many=True).data,
            "count":   qs.count(),
        })

    @action(detail=True, methods=["get"], url_path="timepoints")
    def timepoints(self, request, pk=None):
        """GET /api/patients/{pk}/timepoints/ — all phase records for one patient."""
        patient = self.get_object()
        qs = PatientTimepoint.objects.filter(patient=patient)
        return Response(PatientTimepointSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"], url_path="clinical-summary")
    def clinical_summary(self, request, pk=None):
        """GET /api/patients/{pk}/clinical-summary/ — AI-structured clinical narrative."""
        patient = self.get_object()
        return Response(generate_clinical_summary(patient))

    @action(detail=False, methods=["get"], url_path="critical")
    def critical(self, request):
        """Critical patients: Child-Pugh C or MELD ≥ 25, ordered by severity."""
        limit = int(request.query_params.get("limit", 15))
        qs = Patient.objects.filter(
            Q(child_pugh_category="C") | Q(meld_score__gte=25)
        ).order_by("-meld_score", "-child_pugh_score")
        return Response({
            "results": PatientListSerializer(qs[:limit], many=True).data,
            "count":   qs.count(),
        })
