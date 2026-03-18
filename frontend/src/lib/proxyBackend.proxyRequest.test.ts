import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ProxyContext, ProxyLogMeta } from "./proxyLogger";

vi.mock("./proxyLogger", () => ({
  proxyLog: vi.fn(),
  createRequestId: () => "req-1",
}));

import { proxyRequest, PROXY_REQUEST_TIMEOUT_MS } from "./proxyBackend";
import { proxyLog } from "./proxyLogger";

declare const global: typeof globalThis & {
  fetch?: typeof fetch;
};

describe("proxyRequest (integration avec fetch et proxyLogger)", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  const context: ProxyContext = {
    requestId: "req-ctx",
    route: "api/test",
  };

  beforeEach(() => {
    vi.useFakeTimers();
    (proxyLog as unknown as vi.Mock).mockReset();
    process.env = { ...originalEnv, BACKEND_BASE_URL: "http://backend" };
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("retourne ok=true quand le backend répond 200 avec un JSON valide et logue via proxyLog", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => '{"hello":"world"}',
    } as Response);

    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await proxyRequest(context, {
      method: "POST",
      path: "/api/test",
      token: "jwt-token",
      body: '{"foo":"bar"}',
    });

    expect(result).toEqual({
      ok: true,
      status: 200,
      data: { hello: "world" },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://backend/api/test");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"foo":"bar"}');
    expect(init.headers).toMatchObject({
      Authorization: "Bearer jwt-token",
      "X-Bearer-Token": "jwt-token",
      "Content-Type": "application/json",
    });

    expect(proxyLog).toHaveBeenCalledTimes(1);
    const [, meta] = (proxyLog as unknown as vi.Mock).mock.calls[0] as [ProxyContext, ProxyLogMeta];
    expect(meta.backendStatus).toBe(200);
    expect(meta.ok).toBe(true);
    expect(meta.method).toBe("POST");
    expect(meta.backendUrl).toBe("http://backend/api/test");
    expect(typeof meta.durationMs).toBe("number");
  });

  it("retourne une erreur 502 Backend injoignable quand fetch rejette avec un timeout/abort et ajoute un hint en dev", async () => {
    process.env.NODE_ENV = "development";

    const abortError = new Error("This operation was aborted");
    const fetchSpy = vi
      .fn()
      .mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            vi.advanceTimersByTime(PROXY_REQUEST_TIMEOUT_MS + 10);
            reject(abortError);
          })
      );

    global.fetch = fetchSpy as unknown as typeof fetch;

    const resultPromise = proxyRequest(context, {
      method: "GET",
      path: "/api/slow",
      token: "jwt-token",
    });

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.ok).toBe(false);
    expect(result.status).toBe(502);
    expect(result.data).toMatchObject({
      error: "Backend injoignable",
    });
    expect((result.data as { detail?: string }).detail).toContain("Requête expirée");

    expect(proxyLog).toHaveBeenCalledTimes(1);
    const [, meta] = (proxyLog as unknown as vi.Mock).mock.calls[0] as [ProxyContext, ProxyLogMeta];
    expect(meta.backendStatus).toBeNull();
    expect(typeof meta.durationMs).toBe("number");
    expect(meta.error).toBe("This operation was aborted");
  });

  it("retourne une erreur dérivée du statusText quand le JSON backend est invalide", async () => {
    process.env.NODE_ENV = "test";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Erreur interne",
      text: async () => "not-a-json",
    } as Response);

    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await proxyRequest(context, {
      method: "GET",
      path: "/api/broken",
      token: "jwt-token",
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.data).toMatchObject({
      error: "Erreur interne",
    });

    expect(proxyLog).toHaveBeenCalledTimes(1);
    const [, meta] = (proxyLog as unknown as vi.Mock).mock.calls[0] as [ProxyContext, ProxyLogMeta];
    expect(meta.backendStatus).toBe(500);
    expect(meta.ok).toBe(false);
  });
});

