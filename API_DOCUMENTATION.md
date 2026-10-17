# API (v1)
Interactive docs: `/api/docs/` (Swagger UI), schema: `/api/schema/`. Base: `/api/v1/`. Auth: `Authorization: Bearer <access>`.
Errors: `{"error": {"code", "message", "details"}}`. Lists are paginated (`count,next,previous,results`; `page`, `page_size`).

| Area | Endpoint | Who |
|---|---|---|
| Auth | `POST auth/register/` (patients only), `POST auth/login/`, `POST auth/token/refresh/` (rotating), `POST auth/logout/` (blacklists refresh), `GET/PATCH auth/me/` | public / any |
| Catalog | `GET cities/`, `GET centers/` (`search, city, category, test, ordering=name\|starting_price`), `GET centers/{id}/`, `GET tests/` (`search, category`), `GET tests/{id}/` | public |
| Availability | `GET availability/?center=&service=[&date=]` | any user |
| Patient | `POST appointments/` `{service_id, slot_id}`, `GET appointments/` (`when=upcoming\|past\|cancelled`), `GET appointments/{id}/`, `POST appointments/{id}/cancel/`, `GET dashboard/patient/` | PATIENT |
| Payments | `POST payments/create-order/`, `POST payments/verify/`, `GET payments/`, `POST payments/webhook/` (signature-verified, no JWT) | PATIENT / Razorpay |
| Staff | `GET staff/centers/`, `GET staff/appointments/`, `POST staff/appointments/{id}/status/`, `staff/services/` (GET/POST/PATCH), `staff/slots/` (CRUD), `GET dashboard/staff/` | STAFF (own centers only) |
| Admin | `GET dashboard/admin/` (plus Django Admin) | ADMIN |
| Other | `GET notifications/`, `POST notifications/{id}/read/`, `GET /health/` | auth / public |

Status codes: 400 validation, 401 unauthenticated, 403 wrong role, 404 not found *or not yours*, 409 conflict (slot full, invalid transition),
429 throttled, 503 payment gateway not configured.
