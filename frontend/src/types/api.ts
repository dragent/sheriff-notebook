/**
 * Types partagés pour les réponses API backend (alignés avec Symfony).
 * Source de vérité pour /api/me, grades et rôles sheriff.
 */

/** Réponse GET /api/me (profil utilisateur connecté). */
export interface MeResponse {
  id?: string;
  discordId?: string;
  username?: string;
  avatarUrl?: string | null;
  grade: string | null;
  recruitedAt: string | null;
  allowedFormations: Array<{ id: string; label: string }>;
  /** Catalogue complet des formations (pour affichage tableau de bord, visible par tous). maxGradeOrder = ordre du grade le plus bas qui requiert la formation (4 = Deputy). */
  allFormations?: Array<{ id: string; label: string; maxGradeOrder?: number }>;
  roles?: string[];
}

/** Rôles Symfony considérés comme « sheriff » (sécurité + affichage). */
export const SHERIFF_ROLES = [
  "ROLE_SHERIFF_COMTE",
  "ROLE_SHERIFF_ADJOINT",
  "ROLE_SHERIFF_EN_CHEF",
  "ROLE_SHERIFF",
  "ROLE_SHERIFF_DEPUTY",
] as const;

export type SheriffRole = (typeof SHERIFF_ROLES)[number];

/** Payload brut renvoyé par le backend (avant validation). */
export interface BackendMePayload {
  username?: string;
  grade?: string | null;
  roles?: string[];
  error?: string;
  [key: string]: unknown;
}

/** Résultat normalisé pour le layout (navbar, flashbag). */
export interface BackendMeLayoutResult {
  flashbagError: "network" | "unauthorized" | null;
  serverUsername: string | null;
  serverGrade: string | null;
  serverRoles: string[] | null;
  backendErrorDetail?: string;
}

/** Indique si le tableau de rôles contient au moins un rôle sheriff. */
export function hasSheriffRole(roles: string[] | null | undefined): boolean {
  if (!roles || !Array.isArray(roles)) return false;
  return roles.some((r) => (SHERIFF_ROLES as readonly string[]).includes(r));
}
