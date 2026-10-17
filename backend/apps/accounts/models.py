from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models

from apps.common.models import TimeStampedModel


class Role(models.TextChoices):
    PATIENT = "PATIENT", "Patient"
    STAFF = "STAFF", "Diagnostic center staff"
    ADMIN = "ADMIN", "Administrator"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create(self, email, password, **extra):
        if not email:
            raise ValueError("Email is required")
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("role", Role.PATIENT)
        return self._create(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.update(is_staff=True, is_superuser=True, role=Role.ADMIN)
        return self._create(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.PATIENT)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False, help_text="Can access Django admin")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]
    objects = UserManager()

    class Meta:
        indexes = [models.Index(fields=["role"])]

    def __str__(self):
        return self.email


class PatientProfile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="patient_profile")
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    city = models.CharField(max_length=80, blank=True)

    def __str__(self):
        return f"Profile<{self.user.email}>"
