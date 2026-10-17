from django.core.management.base import BaseCommand

from apps.appointments.services import expire_stale


class Command(BaseCommand):
    help = "Expire unpaid appointments whose hold window has passed (run every minute via cron/ECS scheduled task)."

    def handle(self, *args, **opts):
        self.stdout.write(f"Expired {expire_stale()} appointment(s).")
