import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createBackendJwt } from "./backendJwt";
import type { Session } from "next-auth";

const envSecret = process.env.BACKEND_JWT_SECRET;

afterEach(() => {
  if (envSecret !== undefined) {
    process.env.BACKEND_JWT_SECRET = envSecret;
  } else {
    delete process.env.BACKEND_JWT_SECRET;
  }
});

function makeSession(overrides: Partial<Session["user"]> = {}): Session {
  return {
    user: {
      name: "TestUser",
      discordId: "123456789",
      image: "https://example.com/avatar.png",
      ...overrides,
    },
    expires: "9999-12-31",
  };
}

describe("createBackendJwt", () => {
  beforeEach(() => {
    process.env.BACKEND_JWT_SECRET = "test-secret-for-unit-tests-only";
  });

  it("retourne un JWT signé (string non vide)", () => {
    const session = makeSession();
    const token = createBackendJwt(session);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    expect(token.split(".")).toHaveLength(3);
  });

  it("lance si BACKEND_JWT_SECRET est vide", () => {
    process.env.BACKEND_JWT_SECRET = "   ";
    expect(() => createBackendJwt(makeSession())).toThrow("Missing BACKEND_JWT_SECRET");
  });

  it("lance si la session n'a pas de discordId", () => {
    const session = makeSession({ discordId: undefined });
    expect(() => createBackendJwt(session)).toThrow("Invalid session");
  });

  it("lance si la session n'a pas de username (name)", () => {
    const session = makeSession({ name: null });
    expect(() => createBackendJwt(session)).toThrow("Invalid session");
  });
});
