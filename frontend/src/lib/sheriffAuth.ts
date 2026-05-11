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
 * Suppression définitive d’une ligne de saisie + rapport Discord « Erreur de saisie » (comté / adjoint).
 */
export function canCorrectSaisieErrors(grade: string | null | undefined): boolean {
  if (!grade) return false;
  return COMTE_ADJOINT_GRADES.has(grade);
}

/**
 * Indique si le grade donne accès à la page Destruction (réduction du stock via enregistrement de destruction).
 * Aligné sur le backend : tout grade sheriff, y compris Deputy — la correction directe des quantités sur Saisies reste comté/adjoint.
 */
export function canAccessDestructionPage(
  grade: string | null | undefined
): boolean {
  return isSheriffGrade(grade);
}
