# Testing — what was actually run
Environment used: Ubuntu sandbox, Python 3.12, **PostgreSQL 16 (native, not Docker)**, Node 22.

| Check | Command | Result when generated |
|---|---|---|
| Backend tests (45) | `cd backend; python -m pytest` | **45 passed** on PostgreSQL |
| Concurrent booking (8 threads, capacity 2) | included above | exactly 2 succeed |
| Migrations consistent | `python manage.py makemigrations --check` | no changes |
| OpenAPI schema / Swagger | `GET /api/schema/`, `/api/docs/` | 200, 30 paths |
| Live smoke test | login → search → availability → book → pay w/o keys | worked; 503 with instructions |
| Frontend type-check | `cd frontend; npx tsc --noEmit` | 0 errors |
| Web bundle | `npx expo export --platform web` | built |
| Android Hermes bundle | `npx expo export --platform android` | built |

Backend coverage: registration (role escalation ignored), login/refresh/logout-blacklist, profile, center/test listing + filters,
inactive services hidden, availability, server-side pricing, capacity (sequential + concurrent), duplicate booking, expired holds,
cancellation + cutoff, state machine, patient data isolation, payment order idempotency, bad/valid checkout signatures,
invalid + duplicate webhooks, amount mismatch, failure→retry, late payment→refund flag, staff isolation/permissions, slot-capacity guards, admin dashboard.

**NOT verified**: Docker Compose itself (no Docker in the build sandbox; files are standard but unexecuted), real Razorpay sandbox checkout/webhooks,
running the app in Expo Go / emulator / a browser (no visual QA or screenshots), screen-reader behavior, AWS. Frontend has no unit/component tests.
Expect to fix small UI polish issues on first real run.
