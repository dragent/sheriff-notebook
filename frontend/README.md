# Frontend — Sheriff's Office Annesburg

**Next.js 16 / React 19** frontend. It handles:

- **Discord** authentication via NextAuth;
- the sheriff UI (profile, reference, service planning, accounting, seizures, destructions, coffers);
- calls to the Symfony backend via **API proxies** documented in `docs/PROXY_SPEC.md`.

All UI text is in **French**.

---

## Development

From the project root with Docker, see the root README. To run only the frontend locally without Docker:

```bash
cd frontend
npm install
npm run dev
```

The app is available at `http://localhost:3000`.

Important frontend variables (see `frontend/.env.local.example`):

- `NEXTAUTH_URL`: site URL (e.g. `http://localhost:3000` in dev);
- `NEXTAUTH_SECRET`: NextAuth session secret;
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`: Discord OAuth credentials;
- `BACKEND_BASE_URL`: Symfony backend URL (with Docker: `http://backend`).

---

## Frontend architecture

- **App Router** (`src/app/`) with layouts and server component routes.
- **Auth**: `src/lib/auth.ts`, `src/lib/backendJwt.ts` (JWT shared with the backend).
- **Backend proxies**: `src/lib/proxyBackend.ts`, used by `/api/*` handlers (see `docs/PROXY_SPEC.md`).
- **Styles**: Tailwind CSS (global config in `src/app/globals.css`).

Backend calls **never go directly** from the client: they go through Next route handlers or `getBackendBase()` on the server.

---

## Frontend tests

Unit tests with **Vitest**:

```bash
cd frontend
npm run test
```

Priority areas:

- backend infra (`getBackendBase()`, `createBackendJwt()`, `PROXY_REQUEST_TIMEOUT_MS`);
- proxies (`proxyBackend.ts`): error codes (401 / 400 / 502) and JSON log format;
- critical business pages (profile, services, accounting) for main states.

---

## Observability

The frontend is instrumented with **Sentry** (see `docs/OBSERVABILITY.md` and `next.config.js`):

- `NEXT_PUBLIC_SENTRY_DSN`: frontend Sentry DSN;
- `SENTRY_ENVIRONMENT`: `development`, `staging`, `production`;
- in production, a percentage of requests are traced (performance traces).

In dev, no events are sent unless DSNs are configured.
