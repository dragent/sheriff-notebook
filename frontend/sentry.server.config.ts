/**
 * Initialisation Sentry côté serveur (Node.js).
 * N’envoie rien si NEXT_PUBLIC_SENTRY_DSN (ou SENTRY_DSN) n’est pas défini.
 */

import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || process.env.SENTRY_DSN?.trim();
const env =
  process.env.SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV || "production";

if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    enabled:
      process.env.NODE_ENV === "production" ||
      process.env.SENTRY_ENABLED === "true",
    tracesSampleRate: process.env.NODE_ENV === "development" ? 0 : 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      // Optionnel : filtrer certaines erreurs serveur (ex. 404, timeouts)
      if (event.exception?.values?.[0]?.value?.includes("NEXT_NOT_FOUND")) {
        return null;
      }
      return event;
    },
  });
}
