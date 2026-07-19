from django.urls import path
from .views import hospital_list, department_list

urlpatterns = [
    path("hospitals/",   hospital_list,   name="org-hospitals"),
    path("departments/", department_list, name="org-departments"),
]
