from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .authentication import UserJWTAuthentication
from .models import User
from .serializers import (
    UserSerializer, UserUpdateSerializer,
    LoginSerializer, ChangePasswordSerializer,
)


def _get_tokens(user: User) -> dict:
    refresh = RefreshToken()
    access  = refresh.access_token

    claims = {
        "user_id":  user.id,
        "email":    user.email,
        "role":     user.role,
        "full_name": user.get_full_name(),
    }
    for k, v in claims.items():
        refresh[k] = v
        access[k]  = v

    return {"access": str(access), "refresh": str(refresh)}


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        email    = ser.validated_data["email"].strip().lower()
        password = ser.validated_data["password"]

        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            raise AuthenticationFailed("Invalid credentials.")

        if not user.check_password(password):
            raise AuthenticationFailed("Invalid credentials.")

        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        tokens = _get_tokens(user)
        return Response({**tokens, "doctor": UserSerializer(user).data})


class LogoutView(APIView):
    authentication_classes = [UserJWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"detail": "refresh token required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class TokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_str = request.data.get("refresh")
        if not refresh_str:
            return Response({"detail": "refresh token required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            refresh = RefreshToken(refresh_str)
            user_id = refresh.get("user_id")
            user    = User.objects.get(id=user_id, is_active=True)
        except (TokenError, KeyError, User.DoesNotExist):
            return Response({"detail": "Invalid or expired refresh token."}, status=status.HTTP_401_UNAUTHORIZED)

        tokens = _get_tokens(user)
        return Response({"access": tokens["access"]})


class MeView(APIView):
    authentication_classes = [UserJWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        ser = UserUpdateSerializer(request.user, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    authentication_classes = [UserJWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(ser.validated_data["current_password"]):
            raise ValidationError({"current_password": "Incorrect password."})

        user.set_password(ser.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated successfully."})
