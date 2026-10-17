"""Repeatable seed of FICTIONAL demo data. Safe to run many times."""
from datetime import time, timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.accounts.models import PatientProfile, Role, User
from apps.centers.models import CenterStaffAssignment, DiagnosticCenter
from apps.diagnostics.models import AvailabilitySlot, CenterDiagnosticService, DiagnosticTest

TESTS = [
    ("Complete Blood Count (CBC)", "PATHOLOGY", "Measures red cells, white cells and platelets.", "No special preparation unless advised by your doctor.", 6, 350),
    ("Lipid Profile", "PATHOLOGY", "Cholesterol and triglyceride panel.", "Fasting of 9-12 hours is typically requested by labs; follow your doctor's guidance.", 8, 600),
    ("HbA1c", "PATHOLOGY", "Average blood glucose over roughly three months.", "Usually no fasting required.", 8, 550),
    ("Thyroid Profile (T3, T4, TSH)", "PATHOLOGY", "Thyroid hormone panel.", "Follow the instructions given by your doctor.", 12, 700),
    ("Liver Function Test", "PATHOLOGY", "Enzymes and proteins related to liver function.", "Fasting may be requested by the lab.", 10, 650),
    ("Urine Routine", "PATHOLOGY", "Physical, chemical and microscopic urine examination.", "Collect a clean mid-stream sample.", 6, 200),
    ("Chest X-Ray", "RADIOLOGY", "Basic imaging of chest and lungs.", "Remove metal objects from the chest area.", 4, 500),
    ("Ultrasound Abdomen", "RADIOLOGY", "Ultrasound imaging of abdominal organs.", "A full bladder and fasting may be requested.", 6, 1400),
    ("MRI Brain", "RADIOLOGY", "Magnetic resonance imaging of the brain.", "Inform staff about implants or devices before the scan.", 24, 7500),
    ("CT Scan Chest", "RADIOLOGY", "Cross-sectional imaging of the chest.", "Follow the centre's instructions regarding contrast.", 12, 4500),
    ("Full Body Health Checkup", "PREVENTIVE", "Bundle of common screening tests.", "Fasting instructions provided at booking.", 24, 3500),
    ("Senior Citizen Health Package", "PREVENTIVE", "Screening package designed for older adults.", "Fasting instructions provided at booking.", 24, 4200),
    ("Women's Wellness Package", "PREVENTIVE", "Preventive screening package.", "Fasting instructions provided at booking.", 24, 3900),
    ("ECG", "GENERAL", "Electrical activity of the heart.", "Wear loose, comfortable clothing.", 1, 400),
    ("Vitamin D (25-OH)", "GENERAL", "Vitamin D level in blood.", "Usually no fasting required.", 12, 1200),
    ("Allergy Panel (Basic)", "GENERAL", "Common allergen screening panel.", "Follow your doctor's guidance on medications.", 48, 2800),
]

CENTERS = [  # name, city, address, phone
    ("Lumina Diagnostics (Demo)", "Chennai", "12 Example Street, Adyar", "+91 44 0000 0001"),
    ("Harbor Health Labs (Demo)", "Chennai", "45 Sample Road, T. Nagar", "+91 44 0000 0002"),
    ("Cedar Imaging Centre (Demo)", "Bengaluru", "8 Placeholder Avenue, Indiranagar", "+91 80 0000 0003"),
    ("Northstar Pathology (Demo)", "Bengaluru", "27 Fiction Lane, Koramangala", "+91 80 0000 0004"),
    ("Coastline Diagnostics (Demo)", "Mumbai", "3 Imaginary Marg, Bandra", "+91 22 0000 0005"),
    ("Vertex Scan & Lab (Demo)", "Mumbai", "19 Mock Colony, Andheri", "+91 22 0000 0006"),
]

DEMO_USERS = [
    ("admin@medibook.demo", "Demo Admin", Role.ADMIN, "Admin@12345"),
    ("staff.chennai@medibook.demo", "Demo Staff Chennai", Role.STAFF, "Staff@12345"),
    ("staff.bengaluru@medibook.demo", "Demo Staff Bengaluru", Role.STAFF, "Staff@12345"),
    ("patient@medibook.demo", "Demo Patient", Role.PATIENT, "Patient@12345"),
]


class Command(BaseCommand):
    help = "Seed fictional demo data (development only unless --force)."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Allow seeding when DEBUG is False")
        parser.add_argument("--days", type=int, default=14)

    def handle(self, *args, **opts):
        if not settings.DEBUG and not opts["force"]:
            raise CommandError("Refusing to create demo users with known passwords when DEBUG is off. Use --force.")
        tests = {}
        for name, cat, desc, prep, tat, _ in TESTS:
            t, _c = DiagnosticTest.objects.update_or_create(
                name=name, defaults=dict(category=cat, description=desc, preparation=prep, turnaround_hours=tat, is_active=True))
            tests[name] = t
        centers = []
        for i, (name, city, addr, phone) in enumerate(CENTERS):
            c, _c = DiagnosticCenter.objects.update_or_create(
                name=name, city=city,
                defaults=dict(address=addr, phone=phone, email=f"contact{i+1}@medibook.demo", opening_time=time(8, 0),
                              closing_time=time(18, 0), is_demo=True, is_active=True,
                              description="Fictional demonstration diagnostic centre. Not a real facility."))
            centers.append(c)
            for j, (tname, *_rest, base) in enumerate((t[0], *t[1:5], t[5]) for t in TESTS):
                # each centre offers a deterministic subset with slightly different prices
                if (i + j) % 3 == 2:
                    continue
                price = Decimal(base) * Decimal(str(round(0.9 + ((i * 7 + j * 3) % 5) * 0.05, 2)))
                CenterDiagnosticService.objects.update_or_create(
                    center=c, test=tests[tname], defaults=dict(price=price.quantize(Decimal("1.00")), is_active=True))
        today = timezone.localdate()
        n_slots = 0
        for c in centers:
            for d in range(0, opts["days"] + 1):
                date = today + timedelta(days=d)
                if date.weekday() == 6:  # Sundays closed
                    continue
                for hour in range(9, 17):
                    _s, created = AvailabilitySlot.objects.get_or_create(
                        center=c, date=date, start_time=time(hour, 0),
                        defaults=dict(end_time=time(hour + 1, 0), capacity=2 if hour % 2 else 3))
                    n_slots += created
        for email, name, role, pw in DEMO_USERS:
            u, created = User.objects.get_or_create(email=email, defaults=dict(full_name=name, role=role))
            if created:
                u.set_password(pw)
            u.role, u.is_staff, u.is_superuser = role, role == Role.ADMIN, role == Role.ADMIN
            u.save()
            if role == Role.PATIENT:
                PatientProfile.objects.get_or_create(user=u, defaults={"city": "Chennai"})
        for email, city in (("staff.chennai@medibook.demo", "Chennai"), ("staff.bengaluru@medibook.demo", "Bengaluru")):
            u = User.objects.get(email=email)
            for c in DiagnosticCenter.objects.filter(city=city, is_demo=True):
                CenterStaffAssignment.objects.get_or_create(user=u, center=c)
        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(TESTS)} tests, {len(CENTERS)} centres, {n_slots} new slots, demo users (see README)."))
