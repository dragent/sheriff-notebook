import { describe, it, expect } from "vitest";
import {
  ALL_SHERIFF_GRADES,
  COMTE_ADJOINT_GRADES,
  GRADE_ORDER,
  canPlanningAdminActions,
  isSheriffGrade,
  compareGrades,
  normalizeSheriffGrade,
  resolveRowGrade,
} from "./grades";

describe("grades (matrice grades/formations côté frontend)", () => {
  it("ALL_SHERIFF_GRADES contient des grades uniques et cohérents avec GRADE_ORDER", () => {
    const unique = new Set(ALL_SHERIFF_GRADES);
    expect(unique.size).toBe(ALL_SHERIFF_GRADES.length);

    for (const grade of ALL_SHERIFF_GRADES) {
      expect(GRADE_ORDER[grade]).toBeTypeOf("number");
    }
  });

  it("isSheriffGrade retourne true uniquement pour les grades connus", () => {
    for (const grade of ALL_SHERIFF_GRADES) {
      expect(isSheriffGrade(grade)).toBe(true);
    }
    expect(isSheriffGrade("Inconnu")).toBe(false);
    expect(isSheriffGrade("")).toBe(false);
    expect(isSheriffGrade(null)).toBe(false);
    expect(isSheriffGrade(undefined)).toBe(false);
  });

  it("COMTE_ADJOINT_GRADES inclut les variantes de grades attendues", () => {
    expect(COMTE_ADJOINT_GRADES.has("Sheriff de comté")).toBe(true);
    expect(COMTE_ADJOINT_GRADES.has("Sheriff Adjoint")).toBe(true);
    expect(COMTE_ADJOINT_GRADES.has("Sheriff adjoint")).toBe(true);
  });

  it("canPlanningAdminActions — comté, adjoint, en chef uniquement", () => {
    expect(canPlanningAdminActions("Sheriff de comté")).toBe(true);
    expect(canPlanningAdminActions("Sheriff Adjoint")).toBe(true);
    expect(canPlanningAdminActions("Sheriff adjoint")).toBe(true);
    expect(canPlanningAdminActions("Sheriff en chef")).toBe(true);
    expect(canPlanningAdminActions("Sheriff")).toBe(false);
    expect(canPlanningAdminActions("Deputy")).toBe(false);
    expect(canPlanningAdminActions(null)).toBe(false);
  });

  it("compareGrades respecte l'ordre hiérarchique défini par GRADE_ORDER", () => {
    const shuffled = [...ALL_SHERIFF_GRADES].reverse();
    const sorted = [...shuffled].sort(compareGrades);
    expect(sorted).toEqual(ALL_SHERIFF_GRADES);
  });

  it("compareGrades place les grades inconnus après les grades connus", () => {
    const list = ["Inconnu 2", "Sheriff Deputy", "Inconnu 1"];
    const sorted = [...list].sort(compareGrades);
    expect(sorted[0]).toBe("Sheriff Deputy");
  });

  it("resolveRowGrade ignore les chaînes vides et retombe sur le grade sheriff", () => {
    expect(resolveRowGrade("", "Deputy")).toBe("Deputy");
    expect(resolveRowGrade("   ", "Sheriff Deputy")).toBe("Sheriff Deputy");
    expect(resolveRowGrade(null, "Deputy")).toBe("Deputy");
  });

  it("resolveRowGrade — en cas de conflit, garde le grade le plus élevé (snapshot fiche vs liste)", () => {
    expect(resolveRowGrade("Deputy", "Sheriff")).toBe("Sheriff");
    expect(resolveRowGrade("Sheriff", "Deputy")).toBe("Sheriff");
  });

  it("normalizeSheriffGrade mappe les variantes connues", () => {
    expect(normalizeSheriffGrade("Sheriff adjoint")).toBe("Sheriff Adjoint");
    expect(normalizeSheriffGrade("Sheriff Adjoint")).toBe("Sheriff Adjoint");
  });
});
