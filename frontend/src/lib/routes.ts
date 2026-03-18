/**
 * Routes de l’application — module neutre (sans "use client") pour éviter
 * que l’import depuis Navbar en contexte serveur ne fournisse undefined.
 */
export const ROUTES = {
  HOME: "/",
  PROFIL: "/profil",
  REFERENCE: "/reference",
  REFERENCE_EFFECTIF_PREVIEW: "/reference/effectif-preview",
  COMPTABILITE: "/comptabilite",
  COFFRES: "/coffres",
  SAISIES: "/saisies",
  DESTRUCTION: "/destruction",
} as const;

export type RouteKey = keyof typeof ROUTES;
