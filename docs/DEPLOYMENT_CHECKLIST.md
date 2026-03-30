# Pre-production checklist — Sheriff's Office Annesburg

This document lists items to validate or put in place **before going to production**. The target deployment is **OVH** hosting (see section 8).

---

## 1. Security and secrets

| Item | Status | Action |
|------|--------|--------|
| **APP_SECRET (Symfony)** | Todo | Replace `change_me` (current docker-compose) with a strong random value in prod. |
| **BACKEND_JWT_SECRET** | Todo | Generate a strong value (≥ 32 chars), identical on frontend and backend. Do not reuse the dev value. |
| **Database** | Todo | **PostgreSQL only** for this repo (migrations + Docker + `pdo_pgsql`). MySQL is **not** supported out of the box. Use a dedicated `DATABASE_URL` and a strong password (not `sheriff`/`sheriff`). |
| **Backend debug routes** | Done | In prod (`APP_ENV=prod`), routes `/api/debug/jwt-secret`, `/api/debug/discord`, and `/api/debug/headers` return 404. No diagnostic info is exposed. |
| **Secrets in env** | Todo | In prod: all secrets (NEXTAUTH_SECRET, BACKEND_JWT_SECRET, DISCORD_*, APP_SECRET) must come from environment variables or a vault (e.g. provider secrets), never hardcoded. |

---

## 2. Application configuration

| Item | Status | Action |
|------|--------|--------|
| **BACKEND_BASE_URL** | Required | In prod: internal or public backend URL depending on architecture (e.g. `https://api.sheriff.example.com` or service URL if same domain). |
| **CORS (backend)** | Required | Set `CORS_ALLOW_ORIGIN` with the frontend origin in prod (e.g. regex or list allowing `https://sheriff.example.com`). Currently docker-compose only allows localhost. |
| **Discord** | Required | In the Discord Developer Portal, add the **prod** redirect URI: `https://<your-domain>/api/auth/callback/discord`. |
| **NEXTAUTH_URL** | Required | Must be the public site URL (e.g. `https://sheriff.example.com`). |

---

## 3. Docker and runtime

| Item | Status | Action |
|------|--------|--------|
| **Backend in prod** | Todo | Set `APP_ENV=prod` (and optionally `APP_DEBUG=0`). In prod, use `composer install --no-dev --optimize-autoloader` in the Dockerfile to reduce surface and dev deps. |
| **Dev volumes** | Todo | In prod, do not mount code as volumes (./backend, ./frontend): use the built image for reproducibility and security. |
| **Frontend in prod** | Todo | The frontend Dockerfile runs `npm run dev`. For prod: build with `npm run build` then run `npm run start` (or multi-stage image: build then CMD `next start`). |
| **Health checks** | Done | In `docker-compose.yml`: `db` (pg_isready), `backend` (GET /api/health, requires curl in image), `frontend` (GET /). Startup order: backend waits for db healthy, frontend waits for backend healthy. |

---

## 4. Database and migrations

| Item | Status | Action |
|------|--------|--------|
| **Initial data** | As needed | If initial data is needed in prod: run `app:import-services`, and optionally `app:link-service-records-to-users` as in dev. |
| **Backups** | Required | Set up regular backups (pg_dump or equivalent) and a retention policy (daily, weekly). |
| **Migrations** | Required | Run migrations after deployment: `doctrine:migrations:migrate --no-interaction`. Always back up the DB before a migration. |

---

## 5. Observability and operations

| Item | Status | Action |
|------|--------|--------|
| **Logs** | Recommended | Proxies log in JSON (requestId, route, backendStatus, durationMs). Ensure output (stdout/stderr) is collected by your platform (e.g. CloudWatch, Datadog, Loki). |
| **NextAuth session** | Done | In `frontend/src/lib/auth.ts`: `session.maxAge` = 30 days, `session.updateAge` = 24 h. Manual logout only. Adjust if auto-logout or shorter duration is required. |
| **Sentry** | Documented | Configure `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, and `SENTRY_ENVIRONMENT=production` in prod. See [docs/OBSERVABILITY.md](OBSERVABILITY.md) (“Production configuration”). The backend uses `SENTRY_ENVIRONMENT` when set. |
| **Source maps (Sentry)** | Optional | In CI/CD: SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN for uploading source maps (readable stack traces). |

---

## 6. Quality and practices

| Item | Status | Action |
|------|--------|--------|
| **Accessibility** | Optional | Plan an a11y audit (focus, contrast, screen readers) if required by the product. |
| **CI** | Done | CI (lint, tests, build front/back) is already configured. Ensure it runs on the deployment branch (main/master). |
| **Lint / tests** | Done | Before merge: `npm run lint` and `npm run test` (frontend), PHPUnit (backend). Fix any regression. |

---

## 7. Priority summary

**Before first deployment:**

1. Secrets and env: NEXTAUTH_URL, BACKEND_JWT_SECRET, APP_SECRET, DATABASE_URL, CORS_ALLOW_ORIGIN, BACKEND_BASE_URL in prod.
2. Discord: add prod redirect URI in the Discord Developer Portal.
3. Docker: frontend in production mode (build + `next start`), backend with `APP_ENV=prod` and no code volumes in prod.
4. DB: backups + run migrations after deployment.
5. (Recommended) Disable `/api/debug/*` on the backend in prod and configure Sentry.

---

## 8. OVH hosting

The project is intended for deployment on **OVH**. Things to plan for:

| Item | To plan |
|------|---------|
| **Database** | **PostgreSQL** on the same VPS (Docker) or OVH managed (Web Cloud Databases — choose **PostgreSQL**, not MySQL). Set `DATABASE_URL` accordingly. |
| **Backups** | Use OVH automatic backups (VPS snapshots or DB backups) in addition to `pg_dump` if the DB is self-hosted. |
| **DNS** | Point the subdomain (e.g. `sheriff`) to the VPS IP or OVH load balancer. |
| **Env variables** | On VPS: protected `.env` or `.env.production`, or OVH panel env vars if available. Never commit secrets. |
| **Offer** | VPS or instance (Docker available) or Web Cloud with Node + PHP. For Docker Compose (recommended), use a VPS or instance. |
| **Reverse proxy** | Nginx or Apache in front of the frontend (port 3000) and optionally the backend if exposed. Configure proxy to `http://127.0.0.1:3000` (front) and, if needed, to the backend. |
| **TLS / domain** | Use OVH SSL certificate (included depending on offer) or Let’s Encrypt. Set `NEXTAUTH_URL` and Discord URIs with the final domain (e.g. `https://sheriff.your-domain.fr`). |

Once these are covered, the application is ready for production deployment on OVH.
