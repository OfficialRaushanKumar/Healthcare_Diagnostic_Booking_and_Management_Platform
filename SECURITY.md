# Security notes
Implemented: Django password hashing; JWT access (30 min) + rotating, blacklisted refresh (7 d); role field never accepted from clients;
role + object-level scoping in every queryset (patients → own rows, staff → assigned centers); amounts always server-side;
HMAC-SHA256 checkout-signature and webhook-signature verification (constant-time compare); unique webhook event IDs + row locks
for idempotency; auth/payment throttling; CORS allow-list; secrets only via environment (`.env` is git-ignored); Razorpay secret never sent to client;
tokens in Expo SecureStore on devices (sessionStorage on web); uniform error envelope (no stack traces).

Development vs production: set `DJANGO_DEBUG=False`, a long random `DJANGO_SECRET_KEY`, real `DJANGO_ALLOWED_HOSTS`, HTTPS (TLS at the load balancer),
exact `CORS_ALLOWED_ORIGINS`, never run `seed_demo` (known passwords), use secrets manager, rotate Razorpay keys, run `expire_appointments` on a schedule,
review `python manage.py check --deploy`. Not covered: pen-testing, rate limiting beyond DRF throttles (default per-process cache; use Redis in multi-container prod),
account lockout, email verification, audit logging, HIPAA/DPDP compliance review. Do not store real patient health data in this demo.
