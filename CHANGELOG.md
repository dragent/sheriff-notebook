# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2025-03-15

### Added

- **Frontend (Next.js 16, React 19)**  
  - Discord authentication (NextAuth).  
  - Dashboard: planning, service records, equipment, formations.  
  - Saisies (seizures): weapons and items with session inventory.  
  - Destruction records, bureau inventory (ammunition, accessories).  
  - Coffres (safes), comptabilité (accounting).  
  - Référentiel: weapons, items, fines, formations, Discord roster.  
  - Recruit management (Discord members without sheriff roles).  
  - Light/dark theme (Annesburg palette).  
  - Proxies to Symfony API with JWT.

- **Backend (Symfony)**  
  - REST API with JWT authentication (shared secret with frontend).  
  - Users, service records, formations, grades, Discord sync.  
  - Seizure and destruction records, bureau inventory.  
  - County reference (weapons, items, fines, formations).  
  - Accounting (Compta) with balance.  
  - Discord: guild nicknames, roster message, channel notifications.  
  - Doctrine migrations, CSV import commands.

- **DevOps & docs**  
  - Docker Compose (frontend, backend, PostgreSQL).  
  - CI (GitHub Actions): lint, tests, build.  
  - Deployment checklist and CI/CD documentation.  
  - Proxy spec and observability (Sentry) notes.

### Security

- Secrets via environment variables only; no secrets in repo.  
- Debug routes disabled in production.

[1.0.0]: https://github.com/YOUR_USERNAME/sheriff-annesburg/releases/tag/v1.0.0
