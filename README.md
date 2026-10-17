<div align="center">

# MediBook

### Healthcare Diagnostic Booking & Management Platform

Discover diagnostic centers, compare tests, and manage appointments in one place.

**Made by Raushan Kumar**  
SRM Institute of Science and Technology, Chennai

</div>

---

## About the project

MediBook is a full-stack healthcare diagnostics booking platform. Patients can browse diagnostic centers and tests, check availability, book appointments, and pay securely through Razorpay test mode. Diagnostic-center staff can manage appointments, services, prices, and slot capacity.

All centers, accounts, and booking information included for demonstration are fictional.

## Features

- Browse diagnostic centers by city and explore available tests.
- View appointment availability and reserve a time slot.
- Manage bookings and appointment details.
- Support patient and diagnostic-center staff accounts.
- Process payments through Razorpay test mode with server-side signature verification.
- Manage center services, prices, appointments, and capacity as staff.
- Explore API endpoints through the generated Swagger documentation.

## Technology

| Area | Stack |
|---|---|
| Backend | Django, Django REST Framework, Python |
| Database | PostgreSQL |
| Frontend | Expo, React Native, TypeScript |
| Payments | Razorpay test mode |
| Local services | Docker Compose |

## Project structure

```text
backend/       Django project, API apps, and backend tests
frontend/      Expo application for web and mobile
docker-compose.yml
API_DOCUMENTATION.md
TESTING.md
SECURITY.md
AWS_DEPLOYMENT.md
```

## Requirements

- Docker Desktop with Docker Compose
- Node.js 20 or later
- Git
- Python only if running the backend outside Docker

The frontend can run in a browser, Android emulator, or Expo Go.

## Run locally

### 1. Configure and start the backend

From the repository root in PowerShell:

```powershell
Copy-Item backend\.env.example backend\.env
```

Set a secure local `DJANGO_SECRET_KEY` in `backend/.env`. Razorpay test credentials can be added later; the app can start without them.

Start the backend and PostgreSQL:

```powershell
docker compose up --build -d
docker compose exec backend python manage.py seed_demo
```

Database migrations run when the backend container starts. PostgreSQL data is stored in the `pgdata` Docker volume.

| Service | Local URL |
|---|---|
| API | <http://127.0.0.1:8000/> |
| Swagger API docs | <http://127.0.0.1:8000/api/docs/> |
| Django admin | <http://127.0.0.1:8000/admin/> |
| Health check | <http://127.0.0.1:8000/health/> |

### 2. Start the frontend

In a second PowerShell window:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npx expo start
```

Press `w` to open the web app, `a` to open the Android emulator, or scan the QR code using Expo Go.

### API URL configuration

`EXPO_PUBLIC_API_URL` can be set in `frontend/.env`. When it is empty, the app selects a local API URL automatically: Android emulator uses `http://10.0.2.2:8000`; other local targets use `http://127.0.0.1:8000`.

For a physical phone, set the API URL to your computer's LAN address, add that address to `DJANGO_ALLOWED_HOSTS` in `backend/.env`, and allow port 8000 through the Windows Firewall. The Expo web origin must also be included in `CORS_ALLOWED_ORIGINS`.

## Demo accounts

These accounts are created by `seed_demo`. The seed command is intended for local development and refuses to run with `DEBUG` disabled unless `--force` is provided.

| Role | Email | Password |
|---|---|---|
| Patient | `patient@medibook.demo` | `Patient@12345` |
| Staff, Chennai centers | `staff.chennai@medibook.demo` | `Staff@12345` |
| Staff, Bengaluru centers | `staff.bengaluru@medibook.demo` | `Staff@12345` |
| Admin | `admin@medibook.demo` | `Admin@12345` |

Demo seeding is repeatable. Run it again to add appointment slots for upcoming days.

## Payments

Payments use Razorpay **test mode**. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `backend/.env` to enable checkout. Without credentials, the payment screen reports that the gateway is not configured.

Bookings are confirmed only after the backend verifies Razorpay's payment signature or a verified webhook. Automated refunds are not implemented; payments that require a refund are flagged for review.

## Booking rules

- A new booking starts in `PENDING_PAYMENT` and holds slot capacity for 15 minutes by default.
- Unpaid holds expire lazily during reads or when `python manage.py expire_appointments` is run. Production deployments should schedule the command regularly.
- Patients may cancel a pending payment booking at any time. Confirmed bookings can be cancelled up to four hours before the slot.
- Failed payments leave the booking pending until it expires; patients can retry payment.
- Staff cannot manually mark an appointment as confirmed.

The hold duration and cancellation window are configured through `BOOKING_HOLD_MINUTES` and `CANCELLATION_CUTOFF_HOURS` in `backend/.env`.

## Checks

Run the backend tests with PostgreSQL available:

```powershell
docker compose exec backend python -m pytest
```

Type-check the frontend:

```powershell
cd frontend
npx tsc --noEmit
```

See [TESTING.md](TESTING.md) for the project's test coverage and known gaps.

## Known limitations

- Live Razorpay checkout and webhook behavior have not been verified against a live account.
- Expo Go on physical devices and AWS deployment require separate validation.
- The frontend has no automated component tests.
- Password recovery, push notifications, and live geolocation are not implemented.
- Refunds are flagged for review and are not sent automatically.
- On web, authentication tokens are stored in `sessionStorage`.
- Slot capacity belongs to the diagnostic center; slots are not specific to individual tests.

## Project documentation

- [API documentation](API_DOCUMENTATION.md)
- [Testing guide](TESTING.md)
- [Security notes](SECURITY.md)
- [AWS deployment guide](AWS_DEPLOYMENT.md)
