from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import PatientProfile, Role, User


class RegisterSerializer(serializers.ModelSerializer):
    """Public registration. Role is never accepted from the client."""

    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "phone", "password", "confirm_password"]
        read_only_fields = ["id"]

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(attrs["password"], User(email=attrs["email"], full_name=attrs["full_name"]))
        return attrs

    def create(self, validated):
        password = validated.pop("password")
        user = User.objects.create_user(password=password, role=Role.PATIENT, **validated)
        PatientProfile.objects.create(user=user)
        return user


class ProfileSerializer(serializers.ModelSerializer):
    date_of_birth = serializers.DateField(source="patient_profile.date_of_birth", required=False, allow_null=True)
    gender = serializers.CharField(source="patient_profile.gender", required=False, allow_blank=True)
    city = serializers.CharField(source="patient_profile.city", required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "phone", "role", "date_of_birth", "gender", "city"]
        read_only_fields = ["id", "email", "role"]

    def to_representation(self, instance):
        # staff/admin users have no patient_profile row
        if not hasattr(instance, "patient_profile"):
            PatientProfile.objects.get_or_create(user=instance)
            instance.refresh_from_db()
        return super().to_representation(instance)

    def update(self, instance, validated):
        profile_data = validated.pop("patient_profile", {})
        for k, v in validated.items():
            setattr(instance, k, v)
        instance.save()
        if profile_data:
            profile, _ = PatientProfile.objects.get_or_create(user=instance)
            for k, v in profile_data.items():
                setattr(profile, k, v)
            profile.save()
        return User.objects.select_related("patient_profile").get(pk=instance.pk)


class EmailTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token

    def validate(self, attrs):
        attrs["email"] = attrs.get("email", "").lower()
        data = super().validate(attrs)
        data["user"] = ProfileSerializer(self.user).data
        return data
