import { describe, it, expect, afterEach } from "vitest";
import {
  getBackendBase,
  PROXY_REQUEST_TIMEOUT_MS,
  createProxyContext,
  getUserIdFromSession,
  UNAUTHORIZED_JSON,
  BAD_REQUEST_BODY_JSON,
} from "./proxyBackend";

describe("proxyBackend", () => {
  describe("getBackendBase", () => {
    const envBackend = process.env.BACKEND_BASE_URL;

    afterEach(() => {
      if (envBackend !== undefined) {
        process.env.BACKEND_BASE_URL = envBackend;
      } else {
        delete process.env.BACKEND_BASE_URL;
      }
    });

    it("retourne la valeur de BACKEND_BASE_URL si définie", () => {
      process.env.BACKEND_BASE_URL = "https://api.example.com";
      expect(getBackendBase()).toBe("https://api.example.com");
    });

    it("retourne le fallback http://localhost:8080 si BACKEND_BASE_URL absent", () => {
      delete process.env.BACKEND_BASE_URL;
      expect(getBackendBase()).toBe("http://localhost:8080");
    });
  });

  describe("PROXY_REQUEST_TIMEOUT_MS", () => {
    it("définit un timeout raisonnable (20 secondes)", () => {
      expect(PROXY_REQUEST_TIMEOUT_MS).toBe(20_000);
    });
  });

  describe("createProxyContext", () => {
    it("retourne un contexte avec requestId, route et userId optionnel", () => {
      const ctx = createProxyContext("api/me", "discord-123");
      expect(ctx.route).toBe("api/me");
      expect(ctx.userId).toBe("discord-123");
      expect(typeof ctx.requestId).toBe("string");
      expect(ctx.requestId.length).toBeGreaterThan(0);
    });

    it("retourne un contexte sans userId si non fourni", () => {
      const ctx = createProxyContext("api/reference");
      expect(ctx.route).toBe("api/reference");
      expect(ctx.userId).toBeUndefined();
    });
  });

  describe("getUserIdFromSession", () => {
    it("retourne discordId si la session a un user avec discordId", () => {
      const session = {
        user: { name: "Test", discordId: "987654321", image: null },
        expires: "9999",
      };
      expect(getUserIdFromSession(session)).toBe("987654321");
    });

    it("retourne undefined si session est null", () => {
      expect(getUserIdFromSession(null)).toBeUndefined();
    });

    it("retourne undefined si user n'a pas de discordId", () => {
      const session = {
        user: { name: "Test", image: null },
        expires: "9999",
      };
      expect(getUserIdFromSession(session)).toBeUndefined();
    });
  });

  describe("constantes JSON d'erreur", () => {
    it("UNAUTHORIZED_JSON contient le message attendu", () => {
      expect(UNAUTHORIZED_JSON).toEqual({ error: "Non authentifié" });
    });

    it("BAD_REQUEST_BODY_JSON contient le message attendu", () => {
      expect(BAD_REQUEST_BODY_JSON).toEqual({
        error: "Corps de requête invalide",
      });
    });
  });
});
