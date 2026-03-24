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
 * Réinitialiser la grille de présences pour tout le bureau (action « clean » planning).
 * Aligné sur ServiceRecordController::canEditOthersPlanning (ordre ≤ 2).
 */
export function canPlanningAdminActions(
  grade: string | null | undefined
): boolean {
  if (!grade) return false;
  if (COMTE_ADJOINT_GRADES.has(grade)) return true;
  return grade === "Sheriff en chef";
}

/**
 * Compare deux grades pour le tri (plus gradé en premier).
 */
export function compareGrades(a: string, b: string): number {
  const orderA = GRADE_ORDER[a] ?? 99;
  const orderB = GRADE_ORDER[b] ?? 99;
  if (orderA !== orderB) return orderA - orderB;
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/**
 * Grade used for a bureau row: service record first, then sheriff list.
 * Empty strings are ignored so `"" ?? sheriffGrade` does not block the fallback (JS ?? only skips null/undefined).
 */
export function resolveRowGrade(
  recordGrade: string | null | undefined,
  sheriffGrade: string
): string | null {
  const candidates = [recordGrade, sheriffGrade];
  for (const c of candidates) {
    if (c == null) continue;
    const t = typeof c === "string" ? c.trim() : String(c).trim();
    if (t !== "") return t;
  }
  return null;
}

