# VPS installation — Sheriff's Office Annesburg

Target: Debian/Ubuntu VPS (OVH or equivalent) running the project with **Docker Compose** and **Nginx + Let's Encrypt**.

This repo provides:

- `docker-compose.yml` (dev)
- `docker-compose.prod.yml` (prod — recommended on VPS)
- Nginx templates under `docs/nginx/`

---

## 0. DNS and Discord prerequisites

- DNS:
  - `sheriffnotebook.dragent.fr` → VPS public IP (A record)
  - `api.sheriffnotebook.dragent.fr` → same VPS public IP
- Discord Developer Portal:
  - Add the production redirect URI:
    - `https://sheriffnotebook.dragent.fr/api/auth/callback/discord`

---

## 1. VPS base setup (system + Docker)

On the VPS (as a sudo user):

```bash
sudo apt update && sudo apt upgrade -y

# Docker
curl -fsSL https://get.docker.com | sudo sh

# Docker Compose plugin
sudo apt install -y docker-compose-plugin || sudo apt install -y docker-compose

# Optional: run docker without sudo
sudo usermod -aG docker "$USER"
```

Reconnect your SSH session, then verify:

```bash
docker --version
docker compose version || docker-compose --version
```

---

## 2. Clone the repository on the VPS

```bash
sudo mkdir -p /var/www
sudo chown "$USER":"$USER" /var/www

cd /var/www
git clone <YOUR_GIT_URL> "sheriff-annesburg"
cd sheriff-annesburg
git checkout main
```

---

## 3. Production environment file

Create `.env.local` at the repo root (never commit it).

**Docker Compose note:** variables like `POSTGRES_PASSWORD` and `APP_SECRET` are used in **`docker-compose.prod.yml` itself** (the `db` service, etc.). Compose only substitutes them from your **shell** or from a default **`.env`** file — **`env_file: .env.local` on services does not feed `${VAR}` in the YAML**.  
So either:

- pass the same file explicitly: `docker compose --env-file .env.local -f docker-compose.prod.yml ...` (recommended), or  
- copy the interpolation keys into a root `.env`.

### 3.1. Database engine (important)

**This application is designed for PostgreSQL**, not MySQL:

- Symfony’s `DATABASE_URL` must be a **PostgreSQL** DSN (bundled Docker image: `postgres:16-alpine`).
- Doctrine migrations in `backend/migrations/` contain **PostgreSQL-specific SQL** (e.g. `TIMESTAMP … WITHOUT TIME ZONE`, quoted `"user"`, `JSONB` in places). They are **not** guaranteed to run on MySQL.
- The backend Docker image installs **`pdo_pgsql` only** (no `pdo_mysql`).

If your OVH offer only provides **MySQL**, use one of:

1. **PostgreSQL** from the same provider (e.g. OVH Web Cloud Databases — **PostgreSQL**), or  
2. **PostgreSQL in Docker** on the VPS (this repo’s `db` service in `docker-compose.prod.yml`), or  
3. A **dedicated effort** to port migrations / schema for MySQL (not supported out of the box).

---

Minimal required variables for production:

- `NEXTAUTH_URL=https://sheriffnotebook.dragent.fr`
- `NEXTAUTH_SECRET=<strong-random>`
- `DISCORD_CLIENT_ID=...`
- `DISCORD_CLIENT_SECRET=...`
- `BACKEND_JWT_SECRET=<strong-random>` (must match on both sides; this repo shares it via `.env.local`)
- `POSTGRES_PASSWORD=<strong-password>`
- `APP_SECRET=<strong-random>` (Symfony)
- `DATABASE_URL=postgresql://sheriff:<your-strong-password>@db:5432/sheriff?serverVersion=16&charset=utf8`
- (Optional) if you change defaults: `POSTGRES_DB=...`, `POSTGRES_USER=...` and update `DATABASE_URL` accordingly
- `CORS_ALLOW_ORIGIN=^https://sheriffnotebook\.dragent\.fr$` (adjust if you use multiple origins)
- `BACKEND_BASE_URL=http://backend` (recommended with Docker Compose: internal service name)
  - Alternative (if you run frontend outside Docker): `BACKEND_BASE_URL=https://api.sheriffnotebook.dragent.fr`

Optional:

- `DISCORD_GUILD_ID`, `DISCORD_BOT_TOKEN` (nickname support)
- `DISCORD_EFFECTIF_CHANNEL_ID` (roster message posting)
- Sentry: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production`

Template: `.env.example`

---

## 4. Nginx + SSL (Let's Encrypt)

Install Nginx and Certbot:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 4.1 First-time certificate issuance (HTTP only)

```bash
sudo mkdir -p /var/www/certbot

# Copy the HTTP-only config for sheriffnotebook.dragent.fr + api.sheriffnotebook.dragent.fr
sudo cp docs/nginx/sheriffnotebook.dragent.http-only.conf /etc/nginx/sites-available/sheriffnotebook.dragent
sudo ln -sf /etc/nginx/sites-available/sheriffnotebook.dragent /etc/nginx/sites-enabled/

sudo nginx -t && sudo systemctl reload nginx

# One certificate for both names
sudo certbot certonly --webroot -w /var/www/certbot \
  -d sheriffnotebook.dragent.fr -d api.sheriffnotebook.dragent.fr
```

### 4.2 Enable the HTTPS reverse proxy config

Copy the full config and edit domains if required:

```bash
sudo cp docs/nginx/sheriffnotebook.dragent.conf /etc/nginx/sites-available/sheriffnotebook.dragent
sudo nginx -t && sudo systemctl reload nginx
```

Test renewal:

```bash
sudo certbot renew --dry-run
```

Notes:

- The provided Nginx configs assume the Docker stack binds:
  - frontend to `127.0.0.1:3000`
  - backend to `127.0.0.1:8080`

---

## 5. First production run (manual)

From the repo root on the VPS:

```bash
docker compose --env-file .env.local -f docker-compose.prod.yml up -d --build

# Migrations
docker compose --env-file .env.local -f docker-compose.prod.yml exec backend \
  php bin/console doctrine:migrations:migrate --no-interaction
```

Optional (initial data):

```bash
docker compose --env-file .env.local -f docker-compose.prod.yml exec backend php bin/console app:import-services
docker compose --env-file .env.local -f docker-compose.prod.yml exec backend php bin/console app:link-service-records-to-users
```

Checks:

- `curl -s http://127.0.0.1:3000/ | head` (frontend reachable locally)
- `curl -s http://127.0.0.1:8080/api/health` (backend healthy locally)
- Open `https://sheriffnotebook.dragent.fr` in the browser and login with Discord
- Public API (optional): `curl -sSf https://api.sheriffnotebook.dragent.fr/api/health`

---

## 5.1. After first run (checklist)

1. **Discord Developer Portal**: redirect URI exactly `https://sheriffnotebook.dragent.fr/api/auth/callback/discord`.
2. **`.env.local`**: `NEXTAUTH_URL` and `CORS_ALLOW_ORIGIN` match `https://sheriffnotebook.dragent.fr`; `BACKEND_JWT_SECRET` is strong and unchanged after go-live (or users must re-login).
3. **Firewall** (if `ufw` is enabled): allow `22/tcp`, `80/tcp`, `443/tcp` — you do **not** need to publish `3000`/`8080` publicly (Nginx talks to `127.0.0.1`).
4. **Backups**: schedule `pg_dump` of the Postgres volume / DB (see `docs/DEPLOYMENT_CHECKLIST.md`).
5. **Sentry** (optional): set DSN + `SENTRY_ENVIRONMENT=production`.

---

## 6. Operations (common commands)

Logs:

```bash
docker compose --env-file .env.local -f docker-compose.prod.yml logs -f --tail=200 backend
docker compose --env-file .env.local -f docker-compose.prod.yml logs -f --tail=200 frontend
docker compose --env-file .env.local -f docker-compose.prod.yml logs -f --tail=200 db
```

Restart:

```bash
docker compose --env-file .env.local -f docker-compose.prod.yml up -d --build
```

Stop:

```bash
docker compose --env-file .env.local -f docker-compose.prod.yml down
```

---

## 7. CI/CD (automated deploy)

Once the manual deployment works, follow `docs/CI_CD.md` to deploy via GitHub Actions.

**Important:** on the VPS, use the **prod** compose file in your deploy script (not the dev `docker-compose.yml`):

```bash
cd /var/www/sheriff-annesburg
git pull --ff-only origin main
docker compose --env-file .env.local -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.local -f docker-compose.prod.yml exec backend \
  php bin/console doctrine:migrations:migrate --no-interaction
```

See `docs/CI_CD.md` for GitHub Actions secrets and the full SSH job.

