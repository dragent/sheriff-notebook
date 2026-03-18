/**
 * Grades sheriff — liste et ordre hiérarchique.
 * Aligné sur le backend (User::GRADE_TO_ROLE, UserController::VALID_GRADES, SheriffController::GRADE_ORDER).
 */

export const ALL_SHERIFF_GRADES = [
  "Sheriff de comté",
  "Sheriff Adjoint",
  "Sheriff en chef",
  "Sheriff",
  "Sheriff Deputy",
  "Deputy",
] as const;

export type SheriffGrade = (typeof ALL_SHERIFF_GRADES)[number];

export const GRADE_ORDER: Record<string, number> = {
  "Sheriff de comté": 0,
  "Sheriff Adjoint": 1,
  "Sheriff en chef": 2,
  "Sheriff": 3,
  "Sheriff Deputy": 4,
  "Deputy": 5,
};

/**
 * Retourne true si le grade fait partie des grades sheriff.
 */
export function isSheriffGrade(grade: string | null | undefined): boolean {
  return !!grade && (ALL_SHERIFF_GRADES as readonly string[]).includes(grade);
}

export const COMTE_ADJOINT_GRADES = new Set<string>([
  "Sheriff de comté",
  "Sheriff Adjoint",
  "Sheriff adjoint",
]);

/**
 * Compare deux grades pour le tri (plus gradé en premier).
 */
export function compareGrades(a: string, b: string): number {
  const orderA = GRADE_ORDER[a] ?? 99;
  const orderB = GRADE_ORDER[b] ?? 99;
  if (orderA !== orderB) return orderA - orderB;
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

