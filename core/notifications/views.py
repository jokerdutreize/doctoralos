from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Notification
from .serializers import NotificationSerializer


@api_view(["GET"])
def list_notifications(request):
    qs = Notification.objects.all()
    if request.query_params.get("unread_only") == "1":
        qs = qs.filter(is_read=False)
    unread_count = Notification.objects.filter(is_read=False).count()
    return Response({
        "count": qs.count(),
        "unread_count": unread_count,
        "results": NotificationSerializer(qs[:50], many=True).data,
    })


@api_view(["PATCH"])
def mark_read(request, pk):
    try:
        n = Notification.objects.get(pk=pk)
    except Notification.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    n.is_read = True
    n.save(update_fields=["is_read"])
    return Response(NotificationSerializer(n).data)


@api_view(["POST"])
def mark_all_read(request):
    Notification.objects.filter(is_read=False).update(is_read=True)
    return Response({"detail": "All notifications marked as read."})
