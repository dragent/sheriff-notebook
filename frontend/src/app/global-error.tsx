"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Erreur globale : redirige vers l’accueil avec les paramètres d’erreur (full reload).
 */
export default function GlobalError({ error }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("Global error:", error);
    const message =
      error.message?.trim() || "Une erreur critique s'est produite.";
    const truncated = message.slice(0, 400);
    const params = new URLSearchParams({
      error: "global",
      message: truncated,
    });
    window.location.replace(`/?${params.toString()}`);
  }, [error]);

  return null;
}
