import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { apiPatch, apiPost, apiDelete, apiGet } from "./apiClient";
import { API_ERROR_MESSAGES } from "./apiErrors";

type FetchInput = string | URL | Request;
type FetchInit = RequestInit | undefined;
type MockedFetch = ReturnType<typeof vi.fn<(input: FetchInput, init?: FetchInit) => Promise<Response>>>;

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  const mocked: MockedFetch = vi.fn();
  globalThis.fetch = mocked as unknown as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function getFetchMock(): MockedFetch {
  return globalThis.fetch as unknown as MockedFetch;
}

describe("apiPatch", () => {
  it("returns ok with parsed body on 2xx", async () => {
    getFetchMock().mockResolvedValue(jsonResponse({ id: "abc" }, 200));
    const result = await apiPatch<{ id: string }>("/api/services/1", { foo: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe(200);
      expect(result.data).toEqual({ id: "abc" });
    }
  });

  it("uses JSON content-type and serialises body", async () => {
    getFetchMock().mockResolvedValue(jsonResponse({ ok: true }, 200));
    await apiPatch("/api/x", { hello: "world" });
    const init = getFetchMock().mock.calls[0]?.[1];
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ hello: "world" }));
    const headers = init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("treats 204 No Content as ok with undefined data", async () => {
    getFetchMock().mockResolvedValue(new Response(null, { status: 204 }));
    const result = await apiPatch("/api/x");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe(204);
      expect(result.data).toBeUndefined();
    }
  });

  it("maps 401 to the unauthorized message", async () => {
    getFetchMock().mockResolvedValue(jsonResponse({ error: "nope" }, 401));
    const result = await apiPatch("/api/x", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.error).toBe(API_ERROR_MESSAGES.unauthorized);
    }
  });

  it("uses forbiddenMessage override on 403 and exposes raw body", async () => {
    getFetchMock().mockResolvedValue(jsonResponse({ error: "formation only" }, 403));
    const result = await apiPatch(
      "/api/x",
      {},
      { forbiddenMessage: "Pas autorisé pour ce flow." },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error).toBe("Pas autorisé pour ce flow.");
      expect(result.raw).toEqual({ error: "formation only" });
    }
  });

  it("falls back to generic forbidden message when none provided", async () => {
    getFetchMock().mockResolvedValue(jsonResponse({}, 403));
    const result = await apiPatch("/api/x", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(API_ERROR_MESSAGES.forbidden);
    }
  });

  it("maps 404 to notFound and 4xx to validation by default", async () => {
    getFetchMock().mockResolvedValueOnce(jsonResponse({}, 404));
    const a = await apiPatch("/api/x", {});
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.error).toBe(API_ERROR_MESSAGES.notFound);

    getFetchMock().mockResolvedValueOnce(jsonResponse({}, 422));
    const b = await apiPatch("/api/x", {});
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.error).toBe(API_ERROR_MESSAGES.validation);
  });

  it("forwards backend error string for 4xx when provided", async () => {
    getFetchMock().mockResolvedValueOnce(
      jsonResponse({ error: "Champ obligatoire manquant" }, 400),
    );
    const result = await apiPatch("/api/x", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Champ obligatoire manquant");
    }
  });

  it("maps 5xx to a server-down message and prefixes status when body has error", async () => {
    getFetchMock().mockResolvedValueOnce(jsonResponse({}, 500));
    const a = await apiPatch("/api/x", {});
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.error).toBe(API_ERROR_MESSAGES.serverDown);

    getFetchMock().mockResolvedValueOnce(jsonResponse({ error: "boom" }, 502));
    const b = await apiPatch("/api/x", {});
    expect(b.ok).toBe(false);
    if (!b.ok) {
      expect(b.error).toBe("Erreur 502: boom");
    }
  });

  it("returns the network error message when fetch throws", async () => {
    getFetchMock().mockRejectedValue(new TypeError("net down"));
    const result = await apiPatch("/api/x", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(0);
      expect(result.error).toBe(API_ERROR_MESSAGES.network);
    }
  });
});

describe("apiPost / apiDelete / apiGet (HTTP verbs)", () => {
  it("apiPost issues a POST and serialises body when provided", async () => {
    getFetchMock().mockResolvedValue(jsonResponse({}, 200));
    await apiPost("/api/x", { foo: 1 });
    const init = getFetchMock().mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ foo: 1 }));
  });

  it("apiPost without body sends no body (empty payload like reset planning)", async () => {
    getFetchMock().mockResolvedValue(new Response(null, { status: 204 }));
    await apiPost("/api/x");
    const init = getFetchMock().mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeUndefined();
  });

  it("apiDelete issues a DELETE without body", async () => {
    getFetchMock().mockResolvedValue(new Response(null, { status: 204 }));
    await apiDelete("/api/x");
    const init = getFetchMock().mock.calls[0]?.[1];
    expect(init?.method).toBe("DELETE");
    expect(init?.body).toBeUndefined();
  });

  it("apiGet issues a GET without body", async () => {
    getFetchMock().mockResolvedValue(jsonResponse({ ok: 1 }, 200));
    await apiGet("/api/x");
    const init = getFetchMock().mock.calls[0]?.[1];
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
  });
});
