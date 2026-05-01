import { describe, it, expect } from "vitest";
import {
  SHERIFF_ROLES,
  REFERENCE_ADMIN_ROLES,
  hasSheriffRole,
  canSeeReferenceByRoles,
} from "./roles";

describe("SHERIFF_ROLES / REFERENCE_ADMIN_ROLES (catalogue)", () => {
  it("expose les rôles Discord shérifs attendus, sans doublon", () => {
    expect(SHERIFF_ROLES).toEqual([
      "ROLE_SHERIFF_COMTE",
      "ROLE_SHERIFF_ADJOINT",
      "ROLE_SHERIFF_EN_CHEF",
      "ROLE_SHERIFF",
      "ROLE_SHERIFF_DEPUTY",
    ]);
    expect(new Set(SHERIFF_ROLES).size).toBe(SHERIFF_ROLES.length);
  });

  it("REFERENCE_ADMIN_ROLES est un sous-ensemble Comté + Adjoint", () => {
    expect(REFERENCE_ADMIN_ROLES).toEqual([
      "ROLE_SHERIFF_COMTE",
      "ROLE_SHERIFF_ADJOINT",
    ]);
    for (const role of REFERENCE_ADMIN_ROLES) {
      expect(SHERIFF_ROLES).toContain(role);
    }
  });
});

describe("hasSheriffRole", () => {
  it("retourne false sur null / undefined / liste vide", () => {
    expect(hasSheriffRole(null)).toBe(false);
    expect(hasSheriffRole(undefined)).toBe(false);
    expect(hasSheriffRole([])).toBe(false);
  });

  it("retourne true dès qu'un rôle shérif est présent", () => {
    expect(hasSheriffRole(["ROLE_USER", "ROLE_SHERIFF_DEPUTY"])).toBe(true);
    expect(hasSheriffRole(["ROLE_SHERIFF_COMTE"])).toBe(true);
    expect(hasSheriffRole(["ROLE_SHERIFF_ADJOINT"])).toBe(true);
    expect(hasSheriffRole(["ROLE_SHERIFF_EN_CHEF"])).toBe(true);
    expect(hasSheriffRole(["ROLE_SHERIFF"])).toBe(true);
  });

  it("retourne false quand aucun rôle shérif n'est présent", () => {
    expect(hasSheriffRole(["ROLE_USER", "ROLE_GUEST"])).toBe(false);
    expect(hasSheriffRole(["role_sheriff_comte"])).toBe(false);
  });
});

describe("canSeeReferenceByRoles", () => {
  it("retourne true uniquement pour Comté ou Adjoint", () => {
    expect(canSeeReferenceByRoles(["ROLE_SHERIFF_COMTE"])).toBe(true);
    expect(canSeeReferenceByRoles(["ROLE_SHERIFF_ADJOINT"])).toBe(true);
    expect(canSeeReferenceByRoles(["ROLE_USER", "ROLE_SHERIFF_ADJOINT"])).toBe(true);
  });

  it("retourne false pour les autres rôles shérif", () => {
    expect(canSeeReferenceByRoles(["ROLE_SHERIFF_EN_CHEF"])).toBe(false);
    expect(canSeeReferenceByRoles(["ROLE_SHERIFF"])).toBe(false);
    expect(canSeeReferenceByRoles(["ROLE_SHERIFF_DEPUTY"])).toBe(false);
  });

  it("retourne false sur null / undefined / liste vide", () => {
    expect(canSeeReferenceByRoles(null)).toBe(false);
    expect(canSeeReferenceByRoles(undefined)).toBe(false);
    expect(canSeeReferenceByRoles([])).toBe(false);
  });
});
