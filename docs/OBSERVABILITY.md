# Observability — Sentry

This document describes **Sentry** setup for error and performance monitoring (Next.js frontend and Symfony backend).

## Activation

No events are sent until DSNs are set. To enable:

1. Create one (or two) project(s) on [sentry.io](https://sentry.io) (one for frontend, one for backend, or shared).
2. Get the DSNs from **Settings → Client Keys (DSN)**.
3. Set the variables in `.env.local` (root) or in your deployment environment files.

## Environment variables

| Variable | Side | Required | Description |
|----------|------|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Frontend | To enable front | Public Sentry project DSN (e.g. `https://xxx@o0.ingest.sentry.io/123`). |
| `SENTRY_PROJECT` | Frontend build | For source maps | Sentry project slug. |
| `SENTRY_AUTH_TOKEN` | Frontend build | For source maps | Sentry auth token (do not commit). |
| `SENTRY_DSN` | Backend | To enable back | Backend project DSN (can be the same as frontend). |
| `SENTRY_ENVIRONMENT` | Both | No | `production`, `staging`, etc. Default: `NODE_ENV` (front) / `kernel.environment` (back). |
| `SENTRY_ORG` | Frontend build | For source maps | Sentry organization slug. |

Without a DSN, the SDK initializes but sends no events.

## Environments

- In **production**: set `SENTRY_ENVIRONMENT=production` (or leave default).
- In **staging / preprod**: set `SENTRY_ENVIRONMENT=staging` to filter errors in Sentry by environment.

Events are tagged with this environment in Sentry.

### Production configuration

To enable Sentry in production and filter errors correctly:

1. Create one (or two) Sentry project(s) and get the DSNs.
2. Set the following in your deployment environment:
   - **Frontend**: `NEXT_PUBLIC_SENTRY_DSN=<frontend_dsn>` and `SENTRY_ENVIRONMENT=production`
   - **Backend**: `SENTRY_DSN=<backend_dsn>` and `SENTRY_ENVIRONMENT=production`
3. Redeploy. Without DSNs, no events are sent; with DSNs and `SENTRY_ENVIRONMENT=production`, errors appear in Sentry under the corresponding tab.

## Filters and sampling

### Frontend

- **Sending**: disabled when `NODE_ENV=development` unless `SENTRY_ENABLED=true` (useful for E2E tests).
- **beforeSend**: errors whose message matches `Abort`, `cancel`, `ResizeObserver`, `Network request failed` are ignored.
- **Server**: `NEXT_NOT_FOUND` errors are ignored.
- **Traces**: `tracesSampleRate: 0.1` in production, `0` in dev. No Session Replay or feedback widget by default.
- **Privacy**: `sendDefaultPii: false` (no IP / user headers by default).

### Backend

- **options** in `config/packages/sentry.yaml`: `traces_sample_rate: 0.1`, `send_default_pii: false`.
- Environment is derived from `%kernel.environment%` (can be overridden via `SENTRY_ENVIRONMENT` if needed).

## Source maps (frontend)

For readable stack traces in Sentry:

1. Create a Sentry [Auth Token](https://sentry.io/settings/account/api/auth-tokens/) (scope `project:releases`).
2. In CI/CD, set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` (do not commit them).
3. On build (`npm run build`), source maps are uploaded to Sentry when a DSN is configured.

See [Sentry Next.js — Source Maps](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/).

## Related files

- **Frontend**: `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, `next.config.ts`, `src/app/global-error.tsx`.
- **Backend**: `config/bundles.php`, `config/packages/sentry.yaml`.
