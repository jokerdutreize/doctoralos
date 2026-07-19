from django.urls import path
from .views import (
    LoginView, LogoutView, TokenRefreshView,
    MeView, ChangePasswordView,
)

urlpatterns = [
    path("login/",           LoginView.as_view(),          name="auth-login"),
    path("logout/",          LogoutView.as_view(),          name="auth-logout"),
    path("refresh/",         TokenRefreshView.as_view(),    name="auth-refresh"),
    path("me/",              MeView.as_view(),               name="auth-me"),
    path("change-password/", ChangePasswordView.as_view(),  name="auth-change-password"),
]
