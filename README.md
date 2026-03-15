# Sheriff's Office — Annesburg

Monorepo **Next.js (frontend)** + **Symfony (backend API)**, **Discord** authentication, initial data imported from CSV (service records, etc.), all **dockerized** (Postgres included).

## Prerequisites

- Docker Desktop
- A Discord application (OAuth2)

## Discord configuration

In the **Discord Developer Portal**:

- **Redirect URI**: `http://localhost:3000/api/auth/callback/discord`

### Server display name (nickname)

By default the app shows the **global** Discord username. To show the **server nickname** instead:

1. Create a **Bot** in the Discord Developer Portal (same app or new one).
2. In the **Bot** tab, enable the **Server Members** intent (Privileged Gateway Intents); otherwise the API will return 403.
3. Add the bot to your Discord server (OAuth2 → generated URL with `bot` scope).
4. Set the following variables on the **backend**:
   - **With Docker**: the root **`.env.local`** is loaded by `docker-compose` for `backend` and `frontend`. Put `DISCORD_GUILD_ID` and `DISCORD_BOT_TOKEN` there (create `.env.local` from `.env.example` at the root, see below).
   - **Without Docker**: put them in `backend/.env.local`.
   - `DISCORD_GUILD_ID`: server ID (right-click server → Copy Server ID).
   - `DISCORD_BOT_TOKEN`: bot token (Bot → Reset Token / Copy).
   - **Roster message** (optional): `DISCORD_EFFECTIF_CHANNEL_ID` = ID of the channel where to post the “Annesburg Sheriff Office roster” message (Reference page → Discord roster section). If unset, posting is disabled.

If these variables are empty or the API call fails (bot not in server, intent disabled, etc.), the global Discord username is used.

## Environment files

- **`.env.example`** (at root): list of expected variables, no sensitive values. Use it as a template to create **`.env.local`** at the root (used by `docker-compose` for `backend` and `frontend`). **Never commit secrets** — `.env.local` is ignored by Git.
- **`frontend/.env.local.example`**: same idea for the frontend (Next-specific variables). For local dev without Docker, copy to `frontend/.env.local` and `backend/.env.local` as needed.

## Quick start (Docker)

1) Create **`.env.local`** at the root by copying **`.env.example`**, then fill in the real values (do not commit):

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `BACKEND_JWT_SECRET`

2) Start services:

```bash
docker compose up --build
```

3) Initialize the database and import data (see also [Automation](#automation)):

```bash
docker compose exec backend php bin/console doctrine:migrations:migrate -n
docker compose exec backend php bin/console app:import-services
```

Or in one go: `npm run db:setup` or `make db-setup`.

After the “one service record per user” migration, to link existing records to accounts (by username):

```bash
docker compose exec backend php bin/console app:link-service-records-to-users
```

Or: `npm run db:link-users` / `make db-link-users`.

4) Open the app:

- `http://localhost:3000`

### Environment-specific variables

- **Docker**: `BACKEND_BASE_URL` must be `http://backend` (service name in `docker-compose`). Optional Discord vars (`DISCORD_GUILD_ID`, `DISCORD_BOT_TOKEN`) go in root `.env.local`.
- **Local (no Docker)**: `BACKEND_BASE_URL` = `http://localhost:8080` (or your backend port). See `frontend/.env.local.example` and root `.env.example`.

### Inspect `user` table (Docker)

To list users in the database:

```bash
docker compose exec backend php bin/console app:users:list
```

Or: `npm run users:list` / `make users-list`.

## Automation

Manual steps (migrations, import, linking records) can be run via scripts.

### npm scripts (project root)

Use with Docker services already running (`docker compose up -d`):

| Command | Description |
|---------|-------------|
| `npm run db:setup` | Migrations + import services (full DB init) |
| `npm run db:migrate` | Run Doctrine migrations |
| `npm run db:import` | Import service records |
| `npm run db:import-services` | Import services (CSV) |
| `npm run db:link-users` | Link service records to accounts (once after “one service record per user” migration) |
| `npm run users:list` | List users in the database |

### Makefile (if `make` is installed)

Same actions via make targets:

- `make up` / `make down` — start / stop services
- `make db-setup` — migrations + import (same as `npm run db:setup`)
- `make db-migrate` — migrations
- `make db-import` — import service records
- `make db-import-services` — import services
- `make db-link-users` — link service records to accounts
- `make users-list` — list users

## API endpoints (Symfony)

- `GET /api/health` (public)
- `GET /api/me` (auth)
- (See the frontend and `docs/PROXY_SPEC.md` for the full list of used routes.)

## Code quality (backend)

From the `backend/` directory (or via `docker compose exec backend` if using Docker):

- **PHP-CS-Fixer** (style, Symfony conventions): `composer cs-fix` to fix, `composer cs-check` to check only.
- **PHPStan** (static analysis, level 8): `composer phpstan`.

Config: `backend/.php-cs-fixer.dist.php`, `backend/phpstan.neon`.

## Logo

- The office logo (navbar + home) is loaded from **`frontend/public/logo.png`**.
- To change it: replace this file (same name), no code change needed.

## Reference data — save and reset

### Saving changes (Save button)

Changes on the Reference page are **persisted to the database** when you click **Save**:

1. **Frontend**: the component sends `PUT /api/reference` with the full reference payload (weapons, fines, item categories, formations, etc.) from the current state.
2. **Next.js proxy**: `frontend/src/app/api/reference/route.ts` validates the body (Zod) and proxies the PUT to the backend with the JWT.
3. **Backend**: `CountyReferenceController::put()` loads the `county_reference` singleton, calls `setData($body)` (which merges with existing data and defaults), schedules a Doctrine update and flushes to the database.

You must be logged in with an allowed grade (**County Sheriff** or **Deputy**). If save fails (error message, timeout), ensure the backend is running and `BACKEND_BASE_URL` is correct (see [Troubleshooting — Backend unreachable](#troubleshooting--backend-unreachable--20s-timeout)).

### Backup / export

To avoid data loss, in production you can regularly backup the `county_reference` table or export JSON via `GET /api/reference` (when authenticated).

### If changes do not persist: logs and DB check

1. **Backend logs**: on each successful PUT the backend logs `reference.put: flush start` then `reference.put: flush ok` (with row id and `updatedAt`). With Docker: `docker compose logs backend -f`, then click Save. If you see `flush ok`, the flush succeeded.
2. **Check DB**: confirm the row is updated (`updated_at` and `data`):
   ```bash
   docker compose exec db psql -U sheriff -d sheriff -c "SELECT id, updated_at, left(data::text, 80) AS data_preview FROM county_reference;"
   ```
   Click Save again, run the query: `updated_at` should change and `data_preview` reflect your edits.
3. **Doctrine SQL**: in dev you can enable query logging (e.g. in `config/packages/dev/doctrine.yaml`) to see the UPDATE.

## Troubleshooting — “Backend unreachable” / 20s timeout

If you see *“Backend unreachable — Request expired after 20s”*, the frontend cannot reach the backend.

### With Docker (recommended)

1. **Check containers**:
   ```bash
   docker compose ps
   ```
   `db`, `backend` and `frontend` should be **Up** (and `backend` healthy).

2. **Do not set `BACKEND_BASE_URL` to `localhost` in `.env.local`**  
   `docker-compose.yml` already sets `BACKEND_BASE_URL: "http://backend"` for the frontend. If you set `BACKEND_BASE_URL=http://localhost:8080` in `.env.local`, it may override; from the frontend container, `localhost` is the container itself, not the backend → timeout. **Let compose manage the URL** or set in `.env.local`:
   ```bash
   BACKEND_BASE_URL=http://backend
   ```

3. **Test backend from host**:
   ```bash
   curl -s http://localhost:8080/api/health
   ```
   You should get JSON (e.g. `{"status":"ok"}`). If it hangs or “Connection refused”, the backend is not running or not listening on 8080.

4. **Backend logs**:
   ```bash
   docker compose logs backend
   ```
   Look for PHP errors, database issues, or blocks.

5. **Clean restart**:
   ```bash
   docker compose down
   docker compose up -d
   ```
   Wait for the backend to be **healthy** before using the app.

### Frontend local, backend in Docker

- In `frontend/.env.local` set `BACKEND_BASE_URL=http://localhost:8080`.
- Ensure the backend is running: `docker compose ps` then `curl http://localhost:8080/api/health`.

### Backend local (no Docker)

- Start the backend (e.g. `symfony serve` or PHP built-in from `backend/`).
- In `frontend/.env.local`: `BACKEND_BASE_URL=http://localhost:8080` (or the port used by the backend).

---

## Troubleshooting — “controller[kState].transformAlgorithm is not a function” (dev)

In development, Next.js 16 (Turbopack) may show in the console:

```text
TypeError: controller[kState].transformAlgorithm is not a function
digest: '...'
```

This is a known internal bug (RSC streaming). Pages often still return 200 and the app works. If it causes real issues (blank screen, broken navigation), run the frontend **with Webpack** instead of Turbopack:

- **With Docker**: in `docker-compose.yml`, for the `frontend` service, set the command to  
  `command: ["npm", "run", "dev", "--", "--webpack", "-H", "0.0.0.0", "-p", "3000"]`
- **Local**: `cd frontend && npm run dev:webpack` or `npx next dev --webpack`

In production (`next build` + `next start`) this error does not occur.

---

## Troubleshooting — “Backend rejected the token”

This means the **backend** and **frontend** do not share the **same** `BACKEND_JWT_SECRET`, or the browser is still sending an old JWT signed with the previous secret.

### With Docker

1. **Recreate containers** (to reload `.env.local`):
   ```bash
   cd "D:\Projet\sheriff Annesburg"   # or your project path
   docker compose down
   docker compose up -d --force-recreate backend frontend
   ```

2. **Clear Symfony cache** (so the backend reloads `BACKEND_JWT_SECRET`):
   ```bash
   docker compose exec backend php bin/console cache:clear
   ```

3. **Log out then log in**  
   The session JWT may have been signed with the old secret. Go to `http://localhost:3000`, log out (or clear site cookies), then log in again with Discord to get a new token.

4. **Verify both sides**  
   In development, open `http://localhost:3000/debug/jwt`: Frontend and Backend lengths/previews must match (e.g. 56, `Hm…bU`). This page is disabled in production.

### Without Docker (backend / frontend local)

- **Same value everywhere**: `frontend/.env.local` and `backend/.env.local` must have exactly the same `BACKEND_JWT_SECRET=...` (no extra spaces).
- Restart the Next server and backend after any change to the secret.
- Log out and log in again to regenerate the JWT.

## Tests

- **Frontend**: `npm run test` (from `frontend/`). Vitest — unit tests for backend infra (`getBackendBase()`, `PROXY_REQUEST_TIMEOUT_MS`, `createBackendJwt()`) and proxies (401/400/502, JSON log format).
- **Backend**: `php vendor/bin/simple-phpunit` (from `backend/`). PHPUnit — API controller tests and grade/formation matrix tests (`MeController` via a dedicated service).
  - **Without Docker**: `phpunit.xml.dist` uses SQLite for tests. Create the schema: `php bin/console doctrine:schema:create --env=test --no-interaction`, then run tests.
  - **With Docker**: the backend uses PostgreSQL; in `test` env Doctrine targets `sheriff_test`. The script `docker/db-init/02-create-test-db.sh` creates this database on **first** start of the `db` container. If the volume existed before this script was added, create the DB manually then run migrations:
    ```bash
    docker compose exec db psql -U sheriff -d postgres -c "CREATE DATABASE sheriff_test OWNER sheriff;"
    docker compose exec backend php bin/console doctrine:migrations:migrate --env=test -n
    ```
    Then run tests: `docker compose exec backend php vendor/bin/simple-phpunit`.

Strategy: prioritize tests for **auth**, **proxies**, and **grade/formation reference**. Changes to these areas should ideally include a dedicated test rather than chasing a global coverage number.

## Migrations and deployment

- **Production**: run migrations after deployment: `doctrine:migrations:migrate --no-interaction`. **Back up the database** before any migration (pg_dump or equivalent). For rollback, restore the backup then revert to the previous code version (Doctrine migrations do not provide automatic rollback; add reverse migrations if needed).
- **Strategy**: one migration per deployment; test in staging before prod.
- **Pre-production checklist**: see [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md) for items to validate before going live (secrets, CORS, Docker, Sentry, etc.).

## Observability and practices

### Sentry (errors and performance)

The app is instrumented with **Sentry** on the frontend (Next.js) and backend (Symfony). If no DSN is configured, no events are sent.

| Variable | Where | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Frontend | Sentry project DSN (e.g. `https://xxx@xxx.ingest.sentry.io/xxx`). Exposed in client build. |
| `SENTRY_DSN` | Backend | Backend project DSN (same or separate project). |
| `SENTRY_ENVIRONMENT` | Both | `production`, `staging`, etc. Default: `NODE_ENV` (front) / `kernel.environment` (back). |

**Environments**: in production, set `SENTRY_ENVIRONMENT=production` (or `staging` for preprod) to filter errors in Sentry.

**Frontend filters** (already in place): errors matching `Abort`, `cancel`, `ResizeObserver`, `Network request failed` are ignored; `NEXT_NOT_FOUND` on the server. Trace sampling: 10% in prod, 0 in dev. No send in development unless `SENTRY_ENABLED=true`.

**Source maps (optional)**: for readable stack traces in Sentry, configure in CI/CD `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` (do not commit). See [Sentry Next.js — Source Maps](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/).

Full details: [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md).

- **Health checks**: `docker-compose` defines healthchecks for `db` (pg_isready), `backend` (GET /api/health), and `frontend` (GET /). Backend and frontend start only once the database is healthy; frontend waits for backend to be healthy.
- **Backups**: set up regular database backups (PostgreSQL) and a retention policy (daily, weekly, etc.).
- **Session**: NextAuth session duration is in `frontend/src/lib/auth.ts`: `maxAge` = 30 days, `updateAge` = 24 h (refresh). Logout is manual (Logout button). Adjust for your security policy (auto-logout, etc.).
- **CORS**: backend (Nelmio CORS) must allow the frontend origin in production; check config for your deployment URL.
- **Accessibility**: components use `aria-label` where relevant; for more, plan an a11y audit (focus, contrast, screen readers).

## Releasing

To publish **v1.0.0** (e.g. as a public release):

```bash
git add -A && git status   # ensure no .env or secrets are staged
git commit -m "chore: release v1.0.0"
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin main && git push origin v1.0.0
```

Then on GitHub: **Settings → General → Danger Zone → Change repository visibility** to **Public**. Optionally create a **Release** from the tag and paste the relevant part of [CHANGELOG.md](CHANGELOG.md).

## Notes

- Discord auth is handled by **NextAuth** on the Next.js side.
- The Symfony backend is protected by an **HS256 JWT** signed by the frontend (shared secret `BACKEND_JWT_SECRET`).
- The **`/debug/jwt`** page is disabled in production (404); the Next.js **middleware** protects routes (profile, reference, accounting, coffers, seizures, destruction) and redirects unauthenticated users to the home page.
