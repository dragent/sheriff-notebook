/**
 * Initialisation Sentry pour le runtime Edge.
 * N’envoie rien si NEXT_PUBLIC_SENTRY_DSN n’est pas défini.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
const env =
  process.env.SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV || "production";

if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    enabled:
      process.env.NODE_ENV === "production" ||
      process.env.SENTRY_ENABLED === "true",
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}
