/**
 * Point d’entrée instrumentation Next.js : charge Sentry côté serveur et edge,
 * et expose onRequestError pour capturer les erreurs des Server Components / middleware / proxies.
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
