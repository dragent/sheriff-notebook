/**
 * Centralised API error catalogue for the frontend.
 *
 * Goal: a single place to map fetch outcomes (network / 401 / 403 / 500 / …)
 * to user-facing French messages. Used by `apiClient.ts` and any hand-rolled
 * fetch left in components.
 */

/** Common API error keys. Each maps to a default user-facing message. */
export type ApiErrorKind =
  | "network"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "validation"
  | "serverDown"
  | "unknown";

export const API_ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  network:
    "Erreur réseau. Vérifiez que le backend est démarré (ex. http://localhost:8080) et que BACKEND_BASE_URL est correct.",
  unauthorized: "Session expirée. Reconnectez-vous.",
  forbidden: "Action non autorisée pour votre grade.",
  notFound: "Ressource introuvable.",
  validation: "Requête invalide. Vérifiez les champs saisis.",
  serverDown:
    "Le télégraphe est en panne. Le bureau distant ne répond pas, réessayez dans un instant.",
  unknown: "Une erreur est survenue. Réessayez dans un instant.",
};

/**
 * Context-specific overrides used by the dashboard. Lets us swap messages
 * for the Promotion / Demotion / Reset planning flows without touching the
 * generic catalogue.
 */
export const DASHBOARD_API_ERROR_MESSAGES = {
  formation:
    "Vous ne pouvez valider les formations que pour les grades inférieurs si vous êtes Sheriff de comté, Adjoint ou En chef.",
  planningOther:
    "Modification non autorisée pour cette fiche (présences ou équipement selon les règles du bureau).",
  planningSelf: "Vous ne pouvez modifier que votre propre fiche de service.",
  delete:
    "Vous ne pouvez supprimer que les shérifs de grade inférieur (Sheriff adjoint ou comté requis).",
  promote:
    "Promotion non autorisée : seuls un Sheriff de comté ou un Sheriff adjoint peuvent promouvoir les grades inférieurs.",
  resetPlanning:
    "Réinitialisation réservée au Sheriff de comté, à l'Adjoint ou au Sheriff en chef.",
} as const;

export type DashboardApiErrorContext = keyof typeof DASHBOARD_API_ERROR_MESSAGES;

type MapOptions = {
  /** Optional context-specific message for 403 responses. */
  forbiddenMessage?: string;
  /** Backend body that may contain a usable `error` field. */
  body?: unknown;
};

function readBodyMessage(body: unknown): string | null {
  if (body && typeof body === "object" && "error" in body) {
    const value = (body as { error?: unknown }).error;
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/**
 * Map an HTTP status (after a fetch resolved with !ok) to a user-facing
 * message. When the backend returned a JSON `error` string, prefer it for
 * 5xx (debug-friendly), but always use the safe message for 401/403/404.
 */
export function mapHttpStatusToMessage(
  status: number,
  options: MapOptions = {},
): string {
  if (status === 401) return API_ERROR_MESSAGES.unauthorized;
  if (status === 403) return options.forbiddenMessage ?? API_ERROR_MESSAGES.forbidden;
  if (status === 404) return API_ERROR_MESSAGES.notFound;
  if (status >= 400 && status < 500) {
    return readBodyMessage(options.body) ?? API_ERROR_MESSAGES.validation;
  }
  if (status >= 500 && status < 600) {
    const fromBody = readBodyMessage(options.body);
    return fromBody
      ? `Erreur ${status}: ${fromBody}`
      : API_ERROR_MESSAGES.serverDown;
  }
  return API_ERROR_MESSAGES.unknown;
}
