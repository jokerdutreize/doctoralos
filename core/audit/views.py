from rest_framework import filters
from rest_framework.viewsets import ReadOnlyModelViewSet
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(ReadOnlyModelViewSet):
    """GET /api/audit/logs/ — read-only, admin-only in production."""
    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    filter_backends  = [filters.SearchFilter, filters.OrderingFilter]
    search_fields    = ["user__email", "resource_type", "description", "action"]
    ordering_fields  = ["timestamp", "action", "resource_type"]
    ordering         = ["-timestamp"]
