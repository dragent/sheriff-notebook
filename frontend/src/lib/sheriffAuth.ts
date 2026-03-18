import { COMTE_ADJOINT_GRADES, isSheriffGrade } from "./grades";

/**
 * Indique si le grade donne accès aux pages Comté/Adjoint (Référentiel, Profil, Comptabilité).
 */
export function canAccessComteAdjointPages(
  grade: string | null | undefined
): boolean {
  return !!grade && COMTE_ADJOINT_GRADES.has(grade);
}

/**
 * Indique si le grade donne accès à la page Profil (tout grade sheriff).
 */
export function canAccessProfilPage(
  grade: string | null | undefined
): boolean {
  return isSheriffGrade(grade);
}

/**
 * Indique si le grade donne accès à la page Saisies (tout grade sheriff).
 */
export function canAccessSaisiesPage(grade: string | null | undefined): boolean {
  return isSheriffGrade(grade);
}

/**
 * Indique si le grade donne accès à la page Destruction.
 * Règle métier : à partir de Sheriff Deputy (inclus), donc tous les grades sheriff sauf Deputy.
 */
export function canAccessDestructionPage(
  grade: string | null | undefined
): boolean {
  if (!grade) return false;
  if (grade === "Sheriff Deputy") return true;
  return (
    grade === "Sheriff" ||
    grade === "Sheriff en chef" ||
    COMTE_ADJOINT_GRADES.has(grade)
  );
}
