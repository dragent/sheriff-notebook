/**
 * Structured JSON logs for Next → Symfony proxy requests. One line per request; see docs/PROXY_SPEC.md.
 */

export type ProxyLogMeta = {
  method: string;
  backendUrl: string;
  backendStatus: number | null;
  durationMs: number;
  ok?: boolean;
  error?: string;
};

export type ProxyContext = {
  requestId: string;
  route: string;
  userId?: string;
};

// In dev, log timeouts/aborts as warn to avoid triggering Next.js error overlay.
function isTimeoutOrAbort(meta: ProxyLogMeta): boolean {
  const err = meta.error ?? "";
  return (
    err === "This operation was aborted" ||
    err.includes("abort") ||
    (meta.backendStatus === null && (meta.durationMs ?? 0) >= 15_000)
  );
}

export function proxyLog(context: ProxyContext, meta: ProxyLogMeta): void {
  const level = meta.error ? "error" : "info";
  const msg = meta.error ? "proxy_backend_error" : "proxy_backend";
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    msg,
    ...context,
    ...meta,
  };
  const line = JSON.stringify(payload);
  if (meta.error) {
    if (process.env.NODE_ENV === "development" && isTimeoutOrAbort(meta)) {
      console.warn(line);
    } else {
      console.error(line);
    }
  } else {
    console.info(line);
  }
}

export function createRequestId(): string {
  return crypto.randomUUID();
}
