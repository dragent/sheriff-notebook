# Backend — Sheriff's Office Annesburg

Symfony **API backend** with **Doctrine** and **PostgreSQL**.  
It exposes `/api/*` routes consumed by the Next.js frontend (see `docs/PROXY_SPEC.md`).

Authentication:

- Users authenticate via **Discord** on the frontend;
- the frontend issues an **HS256 JWT** signed with `BACKEND_JWT_SECRET`;
- the backend validates this JWT via a custom authenticator and resolves the user to `App\Entity\User`.

---

## Development (without Docker)

From `backend/`:

```bash
cd backend
composer install

# Start Symfony server (default port 8080)
symfony serve -d
```

Copy defaults, then override locally (`.env` is gitignored):

```bash
cp .env.example .env
```

Configure secrets and overrides in `backend/.env.local`:

- `DATABASE_URL`: PostgreSQL or SQLite URL for dev;
- `BACKEND_JWT_SECRET`: same value as the frontend;
- `DISCORD_GUILD_ID`, `DISCORD_BOT_TOKEN` (optional, for server display name);
- `APP_ENV`, `APP_DEBUG` (default `dev`, `1`).

For Docker, see the root README: the backend is started via `docker compose` and reads variables from root `.env.local`.

---

## Main structure

- `src/Controller/Api/`: API controllers (e.g. `MeController`, accounting, seizures, destructions, coffers).
- `src/Entity/`: Doctrine entities (`User`, `ServiceRecord`, etc.).
- `src/Repository/`: Doctrine repositories.
- `src/Security/`: JWT authenticator shared with the frontend.
- `src/Service/`: business services (e.g. `DiscordGuildMemberResolver`).
- `migrations/`: Doctrine migrations.

All API routes are prefixed by `/api` and return JSON. Errors are normalized by a dedicated subscriber.

---

## Useful commands

From `backend/` or via Docker (`docker compose exec backend ...`):

- **Doctrine migrations**

```bash
php bin/console doctrine:migrations:migrate -n
```

- **Business data import**

```bash
php bin/console app:import-services
php bin/console app:import-dossiers          # if present
php bin/console app:link-service-records-to-users
```

- **List users**

```bash
php bin/console app:users:list
```

Equivalent scripts are available at the root via `npm run db:*` and the Makefile (see root README).

---

## Backend tests

Run tests with **PHPUnit**:

```bash
cd backend
php vendor/bin/simple-phpunit
```

- **Without Docker**: `phpunit.xml.dist` uses SQLite for tests.

```bash
php bin/console doctrine:schema:create --env=test --no-interaction
php vendor/bin/simple-phpunit
```

- **With Docker**: Doctrine targets the `sheriff_test` database (created by `docker/db-init/02-create-test-db.sh`).

```bash
docker compose exec backend php bin/console doctrine:migrations:migrate --env=test -n
docker compose exec backend php vendor/bin/simple-phpunit
```

Test priorities:

- sensitive API controllers (`/api/me`, `/api/me/join-guild`, accounting entries, seizures, destructions);
- **grade / formation** reference logic (`MeController` for `getAllFormations()` and `getAllowedFormationsForGrade()`);
- JWT authentication (token parsing, permissions).

---

## Observability and security

- **Sentry**: enabled on the backend when `SENTRY_DSN` is set (see `docs/OBSERVABILITY.md`).
- **CORS**: handled via Nelmio CORS Bundle; must allow the frontend origin in prod (see `docs/DEPLOYMENT_CHECKLIST.md`).
- **Secrets**:
  - `APP_SECRET` must be strong in production;
  - `BACKEND_JWT_SECRET` must match the frontend and differ from dev;
  - all secrets must come from environment variables (never committed).

In `prod` mode (`APP_ENV=prod`), debug routes (`/api/debug/*`) are disabled (404).
