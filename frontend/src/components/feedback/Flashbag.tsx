"use client";

import { useState } from "react";

type FlashbagVariant = "error" | "warning" | "success" | "default";

type FlashbagProps = {
  children: React.ReactNode;
  id?: string;
  className?: string;
  variant?: FlashbagVariant;
};

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "Erreur de configuration (DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET manquants dans .env.local).",
  AccessDenied: "Accès refusé.",
  OAuthSignin:
    "Impossible de démarrer la connexion Discord. Vérifie que DISCORD_CLIENT_ID et DISCORD_CLIENT_SECRET sont bien renseignés dans frontend/.env.local (portail Discord → ton application → OAuth2).",
  OAuthCallback:
    "Erreur de redirection Discord (OAuth). Dans le portail Discord → OAuth2 → Redirections, l’URI doit correspondre exactement à : https://<ton-domaine>/api/auth/callback/discord (dev : http://localhost:3000/api/auth/callback/discord). Sur le serveur, NEXTAUTH_URL doit être la même base (https, sans slash final). Même application Discord pour Client ID / Secret et pour les redirections. Rebuild le conteneur frontend après changement d’env.",
  OAuthCreateAccount: "Impossible de créer le compte.",
  OAuthAccountNotLinked: "Ce compte Discord est déjà lié à un autre compte.",
  discord:
    "La connexion Discord a échoué. Vérifie OAuth2 → Redirections (https://<ton-domaine>/api/auth/callback/discord) et que Client ID / Secret sont ceux de la même application Discord.",
  Default: "Une erreur est survenue lors de la connexion.",
};

export function getRedirectMessage(error: string | undefined, message: string | undefined): string | null {
  if (!error) return null;
  let decoded = "";
  if (typeof message === "string") {
    try {
      decoded = decodeURIComponent(message);
    } catch {
      decoded = message;
    }
  }
  switch (error) {
    case "404":
      return "Page introuvable (404). La ressource demandée est introuvable.";
    case "app":
      return decoded || "Une erreur s'est produite.";
    case "global":
      return decoded || "Une erreur critique s'est produite.";
    default:
      return (AUTH_ERROR_MESSAGES[error] ?? decoded) || "Une erreur est survenue.";
  }
}

export const BACKEND_ERROR_SHORT: Record<"network" | "unauthorized", string> = {
  network: "Erreur réseau",
  unauthorized: "Token refusé",
};

export const BACKEND_FLASHBAG_MESSAGES: Record<"network" | "unauthorized", React.ReactNode> = {
  network: (
    <>
      Le backend est injoignable (ex.{" "}
      <code className="rounded px-1">http://localhost:8080</code>
      ). Vérifie qu&apos;il est démarré (ex.{" "}
      <code className="rounded px-1">docker compose up -d backend</code>
      ) et que{" "}
      <code className="rounded px-1">BACKEND_BASE_URL</code> est correct.
    </>
  ),
  unauthorized: (
    <>
      Le backend a refusé le token (compte non reconnu). Vérifie que{" "}
      <code className="rounded px-1">BACKEND_JWT_SECRET</code> est
      identique côté frontend et backend. Si tu utilises Docker, lance depuis la
      racine du projet :{" "}
      <code className="rounded px-1">
        docker compose up -d --force-recreate backend
      </code>
      .
    </>
  ),
};

const variantClassMap: Record<FlashbagVariant, string> = {
  default: "flashbag--default",
  warning: "flashbag--warning",
  error: "flashbag--error",
  success: "flashbag--success",
};

export function Flashbag({
  children,
  id,
  className = "",
  variant = "default",
}: FlashbagProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleClose = () => {
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      id={id}
      role="alert"
      className={`flashbag relative flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm select-none focus:ring-offset-2 ${variantClassMap[variant]} ${className}`}
    >
      <div className="flex-1 pr-8" tabIndex={-1}>{children}</div>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Fermer le message"
        className="absolute right-2 top-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition focus:outline-none focus:ring-2 focus:ring-offset-2"
      >
        <span className="sr-only">Fermer</span>
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
