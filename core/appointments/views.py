from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Appointment
from .serializers import AppointmentSerializer


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    GET  /api/appointments/          doctor's appointments (today + upcoming)
    POST /api/appointments/          create
    GET  /api/appointments/today/    today's schedule
    """
    serializer_class = AppointmentSerializer
    filter_backends  = [filters.SearchFilter, filters.OrderingFilter]
    search_fields    = ["patient__name", "patient__patient_id"]
    ordering_fields  = ["scheduled_at", "status"]
    ordering         = ["scheduled_at"]

    def get_queryset(self):
        qs = Appointment.objects.select_related(
            "patient", "doctor", "department"
        )
        # Doctors only see their own; admins see all
        user = self.request.user
        if user.is_authenticated and user.role == "doctor":
            qs = qs.filter(doctor=user)
        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            qs = qs.filter(patient__patient_id=patient_id)
        return qs

    @action(detail=False, methods=["get"], url_path="today")
    def today(self, request):
        now   = timezone.now()
        today = now.date()
        qs    = self.get_queryset().filter(scheduled_at__date=today)
        return Response({
            "results": AppointmentSerializer(qs, many=True).data,
            "count":   qs.count(),
        })
