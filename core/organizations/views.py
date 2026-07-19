from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Hospital, Department
from .serializers import HospitalSerializer, DepartmentSerializer


@api_view(["GET"])
def hospital_list(request):
    qs = Hospital.objects.prefetch_related("departments")
    return Response(HospitalSerializer(qs, many=True).data)


@api_view(["GET"])
def department_list(request):
    qs = Department.objects.select_related("hospital")
    return Response(DepartmentSerializer(qs, many=True).data)
