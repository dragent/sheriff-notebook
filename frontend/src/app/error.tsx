"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Boundary d’erreur : redirige vers l’accueil avec les paramètres d’erreur.
 */
export default function Error({ error }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error("App error:", error);
    const message =
      error.message?.trim() || "Une erreur inattendue s'est produite.";
    const truncated = message.slice(0, 400);
    const params = new URLSearchParams({
      error: "app",
      message: truncated,
    });
    router.replace(`/?${params.toString()}`);
  }, [error, router]);

  return null;
}
