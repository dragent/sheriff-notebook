/**
 * Discord roles used by the frontend authorization layer.
 *
 * Centralised here (single source of truth) instead of being magic strings
 * scattered across components. Values must stay aligned with the backend
 * `Security/RoleNames.php` constants.
 */

/** All sheriff-tier Discord role IDs (any of them implies "is sheriff"). */
export const SHERIFF_ROLES = [
  "ROLE_SHERIFF_COMTE",
  "ROLE_SHERIFF_ADJOINT",
  "ROLE_SHERIFF_EN_CHEF",
  "ROLE_SHERIFF",
  "ROLE_SHERIFF_DEPUTY",
] as const;

export type SheriffRole = (typeof SHERIFF_ROLES)[number];

/**
 * Roles allowed to administer the reference data (weapons / vehicles /
 * formations catalog). Mirrors the "Comté + Adjoint" tier in business logic.
 */
export const REFERENCE_ADMIN_ROLES = [
  "ROLE_SHERIFF_COMTE",
  "ROLE_SHERIFF_ADJOINT",
] as const satisfies readonly SheriffRole[];

export type ReferenceAdminRole = (typeof REFERENCE_ADMIN_ROLES)[number];

/** Returns true if the role list contains any sheriff-tier role. */
export function hasSheriffRole(roles: string[] | null | undefined): boolean {
  if (!roles?.length) return false;
  const known = new Set<string>(SHERIFF_ROLES);
  return roles.some((r) => known.has(r));
}

/**
 * Returns true if the role list grants reference-administration access
 * (Comté + Adjoint).
 */
export function canSeeReferenceByRoles(
  roles: string[] | null | undefined,
): boolean {
  if (!roles?.length) return false;
  const known = new Set<string>(REFERENCE_ADMIN_ROLES);
  return roles.some((r) => known.has(r));
}
