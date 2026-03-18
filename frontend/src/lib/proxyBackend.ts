/**
 * Shared proxy layer for Next API routes calling the Symfony backend. Error strategy and logging: docs/PROXY_SPEC.md.
 */

import type { Session } from "next-auth";
import { proxyLog, createRequestId, type ProxyContext, type ProxyLogMeta } from "./proxyLogger";

export const PROXY_REQUEST_TIMEOUT_MS = 20_000;

export const getBackendBase = (): string =>
  process.env.BACKEND_BASE_URL ?? "http://localhost:8080";

const MESSAGE_BACKEND_UNREACHABLE = "Backend injoignable";
const MESSAGE_DEV_BACKEND_HINT =
  "Vérifie que le backend tourne (docker compose up -d backend) et que BACKEND_BASE_URL est correct (Docker: http://backend, local: http://localhost:8080).";
const MESSAGE_TIMEOUT_HINT = `Requête expirée après ${PROXY_REQUEST_TIMEOUT_MS / 1000}s — le backend n'a pas répondu. ${MESSAGE_DEV_BACKEND_HINT}`;

export type ProxyRequestOptions = {
  method: "GET" | "PUT" | "PATCH" | "POST" | "DELETE";
  path: string;
  body?: string;
  token: string;
  debug401?: boolean;
};

export type ProxyResult =
  | { ok: true; status: number; data: Record<string, unknown> }
  | { ok: false; status: number; data: Record<string, unknown> };

function parseBackendResponse(raw: string, res: Response): Record<string, unknown> {
  let data: Record<string, unknown>;
  try {
    data = (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}) as Record<string, unknown>;
  } catch {
    data = { error: res.statusText || "Réponse backend invalide" };
    if (process.env.NODE_ENV === "development" && raw) {
      data.detail = `Backend (début): ${raw.slice(0, 150)}`;
    }
  }
  return data;
}

export async function proxyRequest(
  context: ProxyContext,
  options: ProxyRequestOptions
): Promise<ProxyResult> {
  const base = getBackendBase();
  const url = `${base}${options.path}`;
  const start = Date.now();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.token}`,
    "X-Bearer-Token": options.token,
  };
  if (options.body !== undefined && options.method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: options.method,
      headers,
      body: options.method === "GET" ? undefined : (options.body ?? "{}"),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const raw = await res.text();
    let data = parseBackendResponse(raw, res);

    if (!res.ok && res.status === 401 && options.debug401 && process.env.NODE_ENV === "development") {
      try {
        const debugRes = await fetch(`${base}/api/debug/headers`, {
          headers: { ...headers },
          cache: "no-store",
        });
        const debugJson = (await debugRes.json()) as Record<string, unknown>;
        data = { ...data, _debugBackendReceivedAuth: debugJson };
      } catch {
        data = { ...data, _debugBackendReceivedAuth: { error: "debug endpoint failed" } };
      }
    }

    const durationMs = Date.now() - start;
    const meta: ProxyLogMeta = {
      method: options.method,
      backendUrl: url,
      backendStatus: res.status,
      durationMs,
      ok: res.ok,
    };
    proxyLog(context, meta);

    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - start;
    const message = e instanceof Error ? e.message : String(e);
    const isTimeout =
      message === "This operation was aborted" ||
      (e instanceof Error && e.name === "AbortError");
    const meta: ProxyLogMeta = {
      method: options.method,
      backendUrl: url,
      backendStatus: null,
      durationMs,
      error: message,
    };
    proxyLog(context, meta);

    const detail =
      process.env.NODE_ENV === "development"
        ? isTimeout
          ? MESSAGE_TIMEOUT_HINT
          : `${MESSAGE_DEV_BACKEND_HINT} ${message}`
        : undefined;
    return {
      ok: false,
      status: 502,
      data: { error: MESSAGE_BACKEND_UNREACHABLE, ...(detail ? { detail } : {}) },
    };
  }
}

export const UNAUTHORIZED_JSON = { error: "Non authentifié" } as const;
export const BAD_REQUEST_BODY_JSON = { error: "Corps de requête invalide" } as const;

export function createProxyContext(route: string, userId?: string): ProxyContext {
  return {
    requestId: createRequestId(),
    route,
    userId,
  };
}

export function getUserIdFromSession(session: Session | null): string | undefined {
  const user = session?.user as { discordId?: string } | undefined;
  return user?.discordId;
}
