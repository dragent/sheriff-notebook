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

/** Wrap Sentry to avoid rare Node Web Streams crashes (e.g. transformAlgorithm on Node 25). */
export const onRequestError: typeof Sentry.captureRequestError = async (...args) => {
  try {
    return await Sentry.captureRequestError(...args);
  } catch (e) {
    console.error("[instrumentation] Sentry.captureRequestError failed:", e);
  }
};
