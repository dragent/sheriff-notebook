# CI/CD — Sheriff's Office Annesburg

This document describes a **full CI/CD pipeline** for this monorepo up to **deployment on an OVH VPS** (or equivalent), using:

- **Existing CI**: GitHub Actions (`.github/workflows/ci.yml`) for lint, tests, and front/back build.
- **Proposed CD**: a second GitHub Actions workflow that deploys to an **OVH VPS with Docker Compose** via SSH.

Goal: a **continuous flow**:

1. Develop on feature branches.
2. Open a PR → CI (lint + tests + build).
3. Merge to `main` → trigger deployment to the OVH server.

---

## 1. Current CI (already in place)

File: `.github/workflows/ci.yml`

- **Triggers**:
  - `push` to `main` or `master`
  - `pull_request` to `main` or `master`
- **Jobs**:
  - `frontend`:
    - `npm ci` (or `npm install` if no lockfile)
    - `npm run lint`
    - `npm run test`
    - `npm run build` (with dummy CI variables for NextAuth / Discord / JWT)
  - `backend`:
    - `composer install --no-interaction --prefer-dist`
    - `php bin/console doctrine:schema:create --env=test --no-interaction`
    - `php vendor/bin/simple-phpunit`

**Purpose**: ensure every deployable PR / commit **passes lint, tests, and build** before reaching the deployment branch.

---

## 2. Chosen deployment strategy (CD)

Several options exist (Docker images pushed to a registry, Kubernetes, etc.).  
For this project we document a **simple, robust** approach:

- **Target**: an **OVH VPS** (Debian/Ubuntu) with:
  - Docker and Docker Compose installed.
  - The Git repo cloned (e.g. `/var/www/sheriff-annesburg`).
- **Architecture**:
  - Backend Symfony, frontend Next.js, and PostgreSQL are managed by `docker-compose.yml`.
  - In prod, adapt `docker-compose.yml` to:
    - set backend to `APP_ENV=prod`, `APP_DEBUG=0`;
    - run the frontend with `next start` after `npm run build` (see `docs/DEPLOYMENT_CHECKLIST.md`).
- **CD**:
  - GitHub Actions connects to the VPS via **SSH**.
  - On the server:
    - `git pull` on the deployment branch (e.g. `main`);
    - `docker compose up -d --build` to rebuild and restart services;
    - run **Doctrine migrations** (`doctrine:migrations:migrate --no-interaction`).

> For a more advanced setup, you can build and push Docker images to a registry (GitHub Container Registry / Docker Hub) and only do `docker compose pull` + `up -d`. The documentation logic stays the same.

---

## 3. Preparing the OVH server

### 3.1. VPS prerequisites

On the OVH VPS (as root or sudo user):

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add your user to docker group (optional)
sudo usermod -aG docker <your_user>

# Install docker compose plugin (distribution-dependent)
sudo apt install docker-compose-plugin -y || sudo apt install docker-compose -y
```

Verify:

```bash
docker --version
docker compose version || docker-compose --version
```

### 3.2. Clone the repository

Choose a directory (e.g. `/var/www/sheriff-annesburg`):

```bash
sudo mkdir -p /var/www
sudo chown <your_user>:<your_user> /var/www
cd /var/www
git clone git@github.com:<YOUR_ORG>/<YOUR_REPO>.git "sheriff-annesburg"
cd sheriff-annesburg
```

Set the deployment branch (default `main`):

```bash
git checkout main
```

### 3.3. Production environment files

- Copy `.env.example` (root) to `.env.local` and set **all prod variables**:
  - `NEXTAUTH_URL=https://sheriff.<your-domain>`
  - `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
  - `BACKEND_JWT_SECRET` (strong, ≥ 32 chars, same on front/back)
  - `APP_SECRET` (Symfony, strong and unique)
  - `DATABASE_URL` (prod Postgres: local container or OVH managed DB)
  - `CORS_ALLOW_ORIGIN` including the frontend domain
  - Sentry (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production`) if used.
- Adapt `backend/.env.local` or `frontend/.env.local` if running **without Docker** (not recommended for this guide).

See `docs/DEPLOYMENT_CHECKLIST.md` for the full pre-prod checklist.

### 3.4. First manual run

On the VPS, to validate everything **before CI/CD**:

```bash
cd /var/www/sheriff-annesburg

# Start services in background
docker compose up -d --build

# Run migrations
docker compose exec backend php bin/console doctrine:migrations:migrate --no-interaction

# (Optional) import business data
docker compose exec backend php bin/console app:import-services
docker compose exec backend php bin/console app:link-service-records-to-users
```

Verify:

- Frontend: `https://sheriff.<your-domain>`
- Backend health: `https://sheriff.<your-domain>/api/health` (or backend URL if separate).

Once this first manual deployment is **ok**, you can automate `git pull + docker compose + migrations` via GitHub Actions.

---

## 4. GitHub secrets for deployment

In **GitHub → Settings → Secrets and variables → Actions → New repository secret**, create:

- `OVH_SSH_HOST`: VPS hostname or IP (e.g. `vpsXXXX.ovh.net`).
- `OVH_SSH_USER`: SSH user (e.g. `debian`, `ubuntu`, or a dedicated user).
- `OVH_SSH_KEY`: **private SSH key** (OpenSSH format) for a public key in `~/.ssh/authorized_keys` on the VPS.
- (optional) `OVH_SSH_PORT`: SSH port if not 22 (e.g. `2222`).

> Never commit a private key to the repo.  
> Password auth is not recommended; use SSH keys.

---

## 5. GitHub Actions deployment workflow (CD)

Create a file `.github/workflows/deploy.yml` (or equivalent) that:

1. Triggers on `push` to `main` (and/or on tag `v*`).
2. Connects to the VPS via SSH.
3. Runs:
   - `git fetch` / `git pull` on `main`;
   - `docker compose up -d --build`;
   - `doctrine:migrations:migrate`.

### 5.1. Minimal workflow example

```yaml
name: Deploy to OVH

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to OVH VPS
    runs-on: ubuntu-latest

    steps:
      - name: Checkout (meta)
        uses: actions/checkout@v4

      - name: SSH to OVH and deploy
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.OVH_SSH_HOST }}
          username: ${{ secrets.OVH_SSH_USER }}
          key: ${{ secrets.OVH_SSH_KEY }}
          port: ${{ secrets.OVH_SSH_PORT || 22 }}
          script: |
            set -e
            cd /var/www/sheriff-annesburg

            echo "[Deploy] Fetch latest code"
            git fetch origin
            git checkout main
            git pull --ff-only origin main

            echo "[Deploy] Build and restart containers"
            docker compose pull || true
            docker compose up -d --build

            echo "[Deploy] Run database migrations"
            docker compose exec backend php bin/console doctrine:migrations:migrate --no-interaction
```

**Notes**:

- `docker compose pull || true` allows later switching to a registry-based strategy (useful when `image:` is set in `docker-compose.yml`).
- `set -e` makes the script fail on first error (the GitHub job will fail).
- The workflow assumes the repo is at `/var/www/sheriff-annesburg` on the VPS and `docker compose` is available.

---

## 6. Variant: trigger on version tag

To deploy only when you create a **version tag** (e.g. `v1.2.3`):

```yaml
on:
  push:
    tags:
      - "v*"
  workflow_dispatch:
```

In that case:

- merge to `main` only CI-validated code;
- **tag** the version when ready (`git tag v1.0.0 && git push origin v1.0.0`);
- let the deploy job run automatically on that tag.

The SSH script stays the same; only the trigger changes.

---

## 7. End-to-end steps (summary)

1. **Development**:
   - create a feature branch from `main`;
   - work locally (Docker or local); commit regularly.
2. **CI on PR**:
   - open a PR to `main`;
   - CI runs: lint, tests, build front/back.
3. **Review / merge**:
   - fix any CI failures;
   - get code review;
   - merge the PR to `main` when ready.
4. **Deployment**:
   - the `Deploy to OVH` workflow runs (or via `workflow_dispatch`);
   - GitHub Actions connects to the VPS:
     - fetches latest code (`git pull main`);
     - rebuilds and restarts containers;
     - runs Doctrine migrations.
5. **Post-deploy checks**:
   - verify key frontend pages (Discord auth, `/profil`, `/reference`, etc.);
   - monitor Sentry (if enabled) and container logs:
     - `docker compose logs -f backend`
     - `docker compose logs -f frontend`

---

## 8. Going further

For a more advanced setup:

- **Adapt `docker-compose.yml` for prod**:
  - remove volumes `./backend:/var/www/html` and `./frontend:/app`;
  - use images built in CI (multi-stage, `next build` then `next start`);
  - set `APP_ENV=prod`, `APP_DEBUG=0`.
- **Use an image registry** (GitHub Container Registry or Docker Hub):
  - add a build/push job in a `build.yml` workflow;
  - in the SSH script, replace `docker compose up -d --build` with `docker compose pull` then `docker compose up -d`.
- **Separate staging and production**:
  - two VPS or two Docker stacks (`docker-compose.staging.yml`, `docker-compose.prod.yml`);
  - two workflows (`deploy-staging.yml`, `deploy-prod.yml`) triggered on different branches/tags.

This documentation provides the **backbone** for CI/CD up to OVH deployment. You can adjust it (OVH offer, registries, staging, etc.) without changing the overall approach: **strict CI before merge, automated and reproducible deployment after merge.**
