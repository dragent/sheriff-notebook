import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { proxyLog, createRequestId } from "./proxyLogger";

describe("proxyLogger", () => {
  describe("createRequestId", () => {
    it("retourne une string au format UUID", () => {
      const id = createRequestId();
      expect(typeof id).toBe("string");
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it("retourne un identifiant unique à chaque appel", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 10; i++) {
        ids.add(createRequestId());
      }
      expect(ids.size).toBe(10);
    });
  });

  describe("proxyLog", () => {
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleInfoSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("appelle console.info quand il n'y a pas d'erreur", () => {
      proxyLog(
        { requestId: "req-1", route: "api/me" },
        {
          method: "GET",
          backendUrl: "http://localhost/api/me",
          backendStatus: 200,
          durationMs: 10,
        }
      );
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      const payload = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(payload.level).toBe("info");
      expect(payload.msg).toBe("proxy_backend");
      expect(payload.requestId).toBe("req-1");
      expect(payload.route).toBe("api/me");
      expect(payload.backendStatus).toBe(200);
    });

    it("appelle console.error quand meta contient une erreur", () => {
      proxyLog(
        { requestId: "req-2", route: "api/reference", userId: "123" },
        {
          method: "PUT",
          backendUrl: "http://localhost/api/reference",
          backendStatus: null,
          durationMs: 5,
          error: "fetch failed",
        }
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      const payload = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(payload.level).toBe("error");
      expect(payload.msg).toBe("proxy_backend_error");
      expect(payload.error).toBe("fetch failed");
    });
  });
});
