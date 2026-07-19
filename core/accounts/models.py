from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ("doctor",      "Doctor"),
        ("nurse",       "Nurse"),
        ("admin",       "Administrator"),
        ("researcher",  "Researcher"),
    ]

    email      = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=60)
    last_name  = models.CharField(max_length=60)
    role       = models.CharField(max_length=20, choices=ROLE_CHOICES, default="doctor")
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name        = "User"
        verbose_name_plural = "Users"
        ordering            = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.get_full_name()} <{self.email}>"

    def get_full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self) -> str:
        return self.first_name


class DoctorProfile(models.Model):
    """Extended profile for users with role='doctor'."""
    user           = models.OneToOneField(User, on_delete=models.CASCADE,
                                          related_name="doctor_profile")
    specialty      = models.CharField(max_length=100, blank=True)
    license_number = models.CharField(max_length=50, blank=True)
    hospital       = models.CharField(max_length=120, blank=True)
    department     = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = "Doctor Profile"

    def __str__(self):
        return f"Dr. {self.user.get_full_name()}"
