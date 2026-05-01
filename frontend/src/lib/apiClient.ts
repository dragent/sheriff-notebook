import { API_ERROR_MESSAGES, mapHttpStatusToMessage } from "@/lib/apiErrors";

/**
 * Discriminated result returned by every helper in this module. Lets callers
 * branch on `result.ok` instead of try / catch around fetch.
 */
export type ApiResult<T = unknown> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; raw?: unknown };

type RequestOptions = {
  /** Extra headers to merge with the defaults. */
  headers?: Record<string, string>;
  /** Optional context-specific message for 403 responses. */
  forbiddenMessage?: string;
  /** AbortSignal forwarded to fetch. */
  signal?: AbortSignal;
  /** Override credentials mode (default: "include"). */
  credentials?: RequestCredentials;
};

const DEFAULT_HEADERS: Readonly<Record<string, string>> = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function safeJson(res: Response): Promise<unknown> {
  try {
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

/** Internal: drives one fetch and resolves to an ApiResult. */
async function request<T>(
  url: string,
  init: RequestInit,
  options: RequestOptions,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      credentials: options.credentials ?? "include",
      signal: options.signal,
      headers: { ...DEFAULT_HEADERS, ...options.headers, ...(init.headers as Record<string, string> | undefined) },
    });
  } catch {
    return { ok: false, status: 0, error: API_ERROR_MESSAGES.network };
  }

  if (res.status === 204) {
    return { ok: true, status: 204, data: undefined as unknown as T };
  }

  const body = await safeJson(res);
  if (res.ok) {
    return { ok: true, status: res.status, data: body as T };
  }
  return {
    ok: false,
    status: res.status,
    error: mapHttpStatusToMessage(res.status, {
      forbiddenMessage: options.forbiddenMessage,
      body,
    }),
    raw: body,
  };
}

/**
 * Issue a JSON PATCH request. Body is serialised with JSON.stringify; pass
 * `null` or omit to send an empty body.
 */
export function apiPatch<T = unknown>(
  url: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  return request<T>(
    url,
    {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    options,
  );
}

/** Issue a JSON POST request. */
export function apiPost<T = unknown>(
  url: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  return request<T>(
    url,
    {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    options,
  );
}

/** Issue a DELETE request (no body by default). */
export function apiDelete<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  return request<T>(url, { method: "DELETE" }, options);
}

/** Issue a GET request. */
export function apiGet<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  return request<T>(url, { method: "GET" }, options);
}
