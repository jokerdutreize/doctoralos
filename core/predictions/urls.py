from django.urls import path
from .views import mortality_risk, rejection_risk, infection_risk

urlpatterns = [
    path("patient/<int:patient_id>/mortality-risk/", mortality_risk, name="predictions-mortality-risk"),
    path("patient/<int:patient_id>/rejection-risk/", rejection_risk, name="predictions-rejection-risk"),
    path("patient/<int:patient_id>/infection-risk/", infection_risk, name="predictions-infection-risk"),
]
