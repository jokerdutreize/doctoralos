from rest_framework.routers import SimpleRouter
from .views import PatientViewSet

router = SimpleRouter()
router.register(r"", PatientViewSet, basename="patient")

urlpatterns = router.urls
