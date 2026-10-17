# AWS deployment guide (documented option — NOT performed or tested)
Target: ECS/Fargate (gunicorn container from `backend/Dockerfile`) behind an ALB with HTTPS (ACM cert), RDS PostgreSQL 16 (private subnets, Multi-AZ optional),
secrets in AWS Secrets Manager/SSM, logs to CloudWatch.
1. **ECR**: `docker build -t medibook-backend backend` → push.
2. **RDS**: PostgreSQL 16, security group allowing 5432 only from the ECS service SG; automated backups (7+ days) and point-in-time recovery; deletion protection.
3. **Secrets**: `DJANGO_SECRET_KEY`, `DATABASE_URL` (`postgres://user:pass@rds-host:5432/medibook`), `RAZORPAY_*` as task-definition secrets. Env: `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS=api.example.com`, `CORS_ALLOWED_ORIGINS=...`.
4. **ECS task** (0.5 vCPU/1 GB to start), container port 8000, health check `GET /health/`; ALB listener 443 → target group, 80 → redirect. Django trusts `X-Forwarded-Proto`.
5. **Migrations**: one-off task `python manage.py migrate --noinput` before/at each deploy. Static files: `collectstatic` (served by WhiteNoise).
6. **Scheduler**: EventBridge rule every minute → ECS task `python manage.py expire_appointments`.
7. **Razorpay webhook** URL: `https://api.example.com/api/v1/payments/webhook/` with live-mode secret when going live.
8. **Mobile**: build with EAS and set `EXPO_PUBLIC_API_URL=https://api.example.com`.
Cost drivers (approximate categories, check current pricing): Fargate vCPU/memory hours, ALB hours + LCUs, RDS instance + storage + backups, NAT gateway (largest hidden cost), CloudWatch logs, data transfer.
