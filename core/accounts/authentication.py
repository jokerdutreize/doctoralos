from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


class UserJWTAuthentication(JWTAuthentication):
    """JWT authentication against the custom User (AbstractBaseUser) model."""

    def get_user(self, validated_token):
        from accounts.models import User

        user_id = validated_token.get("user_id")
        if user_id is None:
            raise AuthenticationFailed("Token missing user_id claim.", code="user_id_missing")
        try:
            return User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            raise AuthenticationFailed("User not found or inactive.", code="user_not_found")
