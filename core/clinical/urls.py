from rest_framework.routers import SimpleRouter
from .views import ClinicalEventViewSet

router = SimpleRouter()
router.register(r"events", ClinicalEventViewSet, basename="clinical-event")

urlpatterns = router.urls
