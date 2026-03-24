# API proxy specification (Next → Symfony)

This document describes the Next.js API routes that proxy to the Symfony backend: inventory, error strategy, and logging strategy.

---

## 1. Proxy inventory

| Next.js route | Method | Symfony backend | Auth required | Description |
|---------------|--------|-----------------|---------------|-------------|
| `/api/me` | GET | `GET /api/me` | Yes | User profile (roles, etc.) |
| `/api/me/join-guild` | POST | `POST /api/me/join-guild` | Yes | Add user to Discord server with Sheriff Deputy role (OAuth token in session) |
| `/api/reference` | PUT | `PUT /api/reference` | Yes | Update reference data (County Sheriff / Deputy) |
| `/api/services/[id]` | PATCH | `PATCH /api/services/{id}` | Yes | Update a service (planning, weapon, etc.) |
| `/api/recruits` | GET | `GET /api/recruits` | Yes | Discord guild members without sheriff role (recruitment); no DB-only fallback |
| `/api/users/[id]` | PATCH | `PATCH /api/users/{id}` | Yes | Update a user's grade (recruitment) |
| `/api/comptabilite` | GET | `GET /api/comptabilite` | Yes | List accounting entries (in/out) |
| `/api/comptabilite` | POST | `POST /api/comptabilite` | Yes | Create an entry (in or out) |
| `/api/saisies` | GET | `GET /api/saisies` | Yes | List seizures (items and weapons) |
| `/api/saisies` | POST | `POST /api/saisies` | Yes | Create a seizure (item or weapon) |
| `/api/destructions` | GET | `GET /api/destructions` | Yes | List destruction history |
| `/api/destructions` | POST | `POST /api/destructions` | Yes | Create a destruction record |
| `/api/destructions/[id]` | PATCH | `PATCH /api/destructions/{id}` | Yes | Single validation: success or lost |
| `/api/coffres` | GET | `GET /api/coffres` | Yes | Bureau inventory (ammo + accessories) |
| `/api/coffres` | PATCH | `PATCH /api/coffres` | Yes | Update a quantity (section + type + quantity) |
| `/api/discord/effectif` | GET | `GET /api/discord/effectif` | Yes | Roster message preview (markdown, count, date) — County Sheriff / Deputy |
| `/api/discord/effectif/send` | POST | `POST /api/discord/effectif/send` | Yes | Publish roster message to Discord channel — County Sheriff / Deputy |

**Non-proxy routes (out of scope):**

- `/api/auth/[...nextauth]`: NextAuth (session), no Symfony call.
- `/api/auth/debug-env`: env diagnostic (dev only), no Symfony call.

**Direct backend calls from Next server (outside Route Handlers):**

- `layout.tsx`: `GET /api/me` via backend (to show user in header).
- Home `page.tsx`: `GET /api/sheriffs` (public list), `GET /api/home-info` (public home info).
- Other pages (profile, reference, etc.): prefer the proxies above when a session is required, to keep a single call path and centralized logs.

---

## 2. Error strategy

### 2.1 HTTP codes and response body

| Code | Situation | JSON body (guaranteed fields) |
|------|-----------|-------------------------------|
| **401** | User not authenticated (missing or invalid NextAuth session). | `{ "error": "Non authentifié" }` |
| **400** | Invalid request body (PUT/PATCH: body unreadable or missing when required). | `{ "error": "Corps de requête invalide" }` |
| **502** | Backend unreachable (timeout, connection refused, network error). | `{ "error": "Backend injoignable" }` + optional in dev: `"detail": "<message>"` |
| **5xx / 4xx** | Backend response (forwarded as-is). | Body from backend (JSON parsed when possible, else `{ "error": "<statusText or raw excerpt>" }`) |

### 2.2 Rules

- **No automatic retry** on the proxy (avoid double writes, cumulative timeouts). The client (browser) may retry.
- **Timeout**: an `AbortController` + `setTimeout` is used in `proxyRequest()`; value is **20 seconds** (`PROXY_REQUEST_TIMEOUT_MS` in `proxyBackend.ts`). On timeout → 502 with `error: "Backend injoignable"`.
- **Non-JSON backend response**: parse when possible; on failure → `{ "error": "Réponse backend invalide" }` (+ `detail` in dev with raw excerpt).
- **401 from backend**: in dev only, the `/api/me` route may enrich the response with a call to `GET /api/debug/headers` (`_debugBackendReceivedAuth`) for debugging.

---

## 3. Logging strategy

### 3.1 Structured format (JSON)

Each proxy call must produce **one JSON log line** with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string (ISO 8601) | Event time. |
| `level` | `"info"` \| `"error"` | `error` on failure (e.g. 502), else `info`. |
| `msg` | string | `proxy_backend` (success) or `proxy_backend_error` (failure). |
| `requestId` | string | Unique UUID per request (correlation). |
| `route` | string | Exposed Next route (e.g. `api/me`, `api/services/123`). |
| `method` | string | HTTP method (GET, PUT, PATCH). |
| `userId` | string \| undefined | Discord ID if session present. |
| `backendUrl` | string | Called URL (no sensitive query). |
| `backendStatus` | number \| null | Backend HTTP status, or `null` if no response (e.g. 502). |
| `durationMs` | number | Fetch duration in milliseconds. |
| `error` | string \| undefined | Present only on exception (e.g. network error message). |

### 3.2 When to log

- **Success**: after receiving the backend response (2xx or forwarded 4xx/5xx).
- **Network / timeout failure**: in the catch (502), with `backendStatus: null` and `error` set.

Output: `console.info` for success, `console.error` for error; one line = one JSON object (for log aggregation in prod).

---

## 4. Implementation

- **Shared module**: `frontend/src/lib/proxyBackend.ts` — `proxyRequest()`, `getBackendBase()`, `createProxyContext()`, and logger `proxyLog()`.
- **Routes**: `api/me`, `api/reference`, `api/services/[id]`, `api/recruits`, `api/users/[id]`, `api/comptabilite`, `api/coffres`, `api/saisies`, `api/destructions`, `api/destructions/[id]` use this module to avoid duplication and ensure the spec (error + log) is followed.
- **Updating this document**: whenever a new proxy route is added or behaviour changes (codes, log fields).
