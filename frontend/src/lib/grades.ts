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

function trimGrade(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = typeof value === "string" ? value.trim() : String(value).trim();
  return t === "" ? null : t;
}

/** Known DB/UI variants → canonical key in GRADE_ORDER. */
const GRADE_ALIASES: Record<string, string> = {
  "Sheriff adjoint": "Sheriff Adjoint",
};

/**
 * Map variants to the canonical grade string used in GRADE_ORDER (and backend VALID_GRADES).
 */
export function normalizeSheriffGrade(
  grade: string | null | undefined
): string | null {
  const t = trimGrade(grade);
  if (!t) return null;
  if (GRADE_ORDER[t] !== undefined) return t;
  const aliased = GRADE_ALIASES[t] ?? GRADE_ALIASES[t.toLowerCase()];
  if (aliased) return aliased;
  const found = Object.keys(GRADE_ORDER).find(
    (k) =>
      k.localeCompare(t, undefined, { sensitivity: "accent" }) === 0
  );
  return found ?? t;
}

function gradeOrderRank(grade: string | null): number {
  if (!grade) return 99;
  const n = normalizeSheriffGrade(grade);
  if (!n) return 99;
  return GRADE_ORDER[n] ?? 99;
}

/**
 * Grade shown on a bureau row: merge fiche service and liste sheriffs.
 * After a promotion PATCH, RSC refresh can briefly expose two snapshots; we pick the
 * **most senior** grade so "Promouvoir" targets the next step for everyone without
 * requiring a manual full reload between each person.
 */
export function resolveRowGrade(
  recordGrade: string | null | undefined,
  sheriffGrade: string
): string | null {
  const r = normalizeSheriffGrade(trimGrade(recordGrade));
  const s = normalizeSheriffGrade(trimGrade(sheriffGrade));
  if (!r && !s) return null;
  if (!r) return s;
  if (!s) return r;
  if (r === s) return r;
  const ro = gradeOrderRank(r);
  const so = gradeOrderRank(s);
  if (ro !== so) return ro < so ? r : s;
  return r;
}

