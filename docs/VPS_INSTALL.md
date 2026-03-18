# VPS installation — Sheriff's Office Annesburg

Target: Debian/Ubuntu VPS (OVH or equivalent) running the project with **Docker Compose** and **Nginx + Let's Encrypt**.

This repo provides:

- `docker-compose.yml` (dev)
- `docker-compose.prod.yml` (prod — recommended on VPS)
- Nginx templates under `docs/nginx/`

---

## 0. DNS and Discord prerequisites

- DNS:
  - `sheriffnotebook.dragent` → VPS public IP
  - `api.sheriffnotebook.dragent` → same VPS public IP
- Discord Developer Portal:
  - Add the production redirect URI:
    - `https://sheriffnotebook.dragent/api/auth/callback/discord`

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

Minimal required variables for production:

- `NEXTAUTH_URL=https://sheriffnotebook.dragent`
- `NEXTAUTH_SECRET=<strong-random>`
- `DISCORD_CLIENT_ID=...`
- `DISCORD_CLIENT_SECRET=...`
- `BACKEND_JWT_SECRET=<strong-random>` (must match on both sides; this repo shares it via `.env.local`)
- `POSTGRES_PASSWORD=<strong-password>`
- `APP_SECRET=<strong-random>` (Symfony)
- `DATABASE_URL=postgresql://sheriff:<your-strong-password>@db:5432/sheriff?serverVersion=16&charset=utf8`
- (Optional) if you change defaults: `POSTGRES_DB=...`, `POSTGRES_USER=...` and update `DATABASE_URL` accordingly
- `CORS_ALLOW_ORIGIN=^https://sheriffnotebook\.dragent$` (adjust if you use multiple origins)
- `BACKEND_BASE_URL=http://backend` (recommended with Docker Compose: internal service name)
  - Alternative (if you run frontend outside Docker): `BACKEND_BASE_URL=https://api.sheriffnotebook.dragent`

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

# Copy the HTTP-only config for sheriffnotebook.dragent + api.sheriffnotebook.dragent
sudo cp docs/nginx/sheriffnotebook.dragent.http-only.conf /etc/nginx/sites-available/sheriffnotebook.dragent
sudo ln -sf /etc/nginx/sites-available/sheriffnotebook.dragent /etc/nginx/sites-enabled/

sudo nginx -t && sudo systemctl reload nginx

# One certificate for both names
sudo certbot certonly --webroot -w /var/www/certbot \
  -d sheriffnotebook.dragent -d api.sheriffnotebook.dragent
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
docker compose -f docker-compose.prod.yml up -d --build

# Migrations
docker compose -f docker-compose.prod.yml exec backend \
  php bin/console doctrine:migrations:migrate --no-interaction
```

Optional (initial data):

```bash
docker compose -f docker-compose.prod.yml exec backend php bin/console app:import-services
docker compose -f docker-compose.prod.yml exec backend php bin/console app:link-service-records-to-users
```

Checks:

- `curl -s http://127.0.0.1:3000/ | head` (frontend reachable locally)
- `curl -s http://127.0.0.1:8080/api/health` (backend healthy locally)
- Open `https://sheriff.<your-domain>` in the browser and login with Discord

---

## 6. Operations (common commands)

Logs:

```bash
docker compose -f docker-compose.prod.yml logs -f --tail=200 backend
docker compose -f docker-compose.prod.yml logs -f --tail=200 frontend
docker compose -f docker-compose.prod.yml logs -f --tail=200 db
```

Restart:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Stop:

```bash
docker compose -f docker-compose.prod.yml down
```

---

## 7. CI/CD (automated deploy)

Once the manual deployment works, follow `docs/CI_CD.md` to deploy via GitHub Actions (SSH → `git pull` → `docker compose up -d --build` → migrations).

