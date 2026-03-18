/**
 * Initialisation Sentry côté client.
 * N’envoie rien si NEXT_PUBLIC_SENTRY_DSN n’est pas défini.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
const env = process.env.SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV || "production";

if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    // Pas d’envoi en développement sauf si explicitement activé (ex. tests E2E)
    enabled: process.env.NODE_ENV === "production" || process.env.SENTRY_ENABLED === "true",
    tracesSampleRate: process.env.NODE_ENV === "development" ? 0 : 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Ne pas envoyer d’infos personnelles par défaut (RGPD)
    sendDefaultPii: false,
    beforeSend(event, hint) {
      // Filtrer les erreurs trop bruitées (ex. résolutions rejetées, annulations)
      const error = hint.originalException;
      if (error && typeof error === "object" && "message" in error) {
        const msg = String((error as Error).message);
        if (/^(Abort|cancel|ResizeObserver)/i.test(msg) || /Network request failed/i.test(msg)) {
          return null;
        }
      }
      return event;
    },
  });
}
