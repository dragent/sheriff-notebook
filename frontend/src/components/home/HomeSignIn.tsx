"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { HomeLogo } from "@/components/home/HomeLogo";
import { Flashbag, AUTH_ERROR_MESSAGES } from "@/components/feedback/Flashbag";
import { ROUTES } from "@/lib/routes";

const SIGNIN_BENEFITS = [
  "Accéder au registre et au planning du bureau",
  "Consulter et mettre à jour ta fiche de service",
  "Valider tes formations (une fois shérif)",
] as const;

type Props = {
  compact?: boolean;
};

/**
 * Bloc de connexion Discord (bouton + erreurs). Mode compact sans logo ni titre.
 */
export function HomeSignIn({ compact = false }: Props) {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? ROUTES.HOME;
  const [loading, setLoading] = useState(false);
  /** Inline sign-in errors only (?error= is shown once by UnifiedFlashbag in the layout). */
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("discord", { callbackUrl, redirect: true });
      if (result?.error) {
        setError(
          result.error === "OAuthCallback"
            ? AUTH_ERROR_MESSAGES.OAuthCallback
            : (AUTH_ERROR_MESSAGES[result.error] ?? String(result.error))
        );
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setLoading(false);
    }
  }

  return (
    <div className="sheriff-animate-in flex flex-col items-center gap-6 py-6 sm:py-8">
      {!compact && (
        <>
          <HomeLogo />
          <h1 className="font-heading-display text-center text-3xl font-semibold tracking-wide text-sheriff-gold sm:text-4xl">
            Bureau du Shérif d&apos;Annesburg
          </h1>
        </>
      )}
      <p className="max-w-md text-center text-sheriff-paper-muted">
        {compact
          ? "Connecte-toi avec Discord pour accéder au registre, au planning et à ta fiche de service."
          : "Registre officiel. Connecte-toi pour accéder au bureau."}
      </p>

      {!compact && (
        <ul className="flex max-w-sm flex-col gap-2.5 text-left text-sm text-sheriff-paper-muted" aria-hidden>
          {SIGNIN_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-sheriff-gold/90" aria-hidden>★</span>
              <span className="leading-snug">{benefit}</span>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="w-full max-w-md">
          <Flashbag variant="error">{error}</Flashbag>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleSignIn}
          disabled={loading}
          className="sheriff-focus-ring sheriff-transition sheriff-btn-home-discord"
        >
          {loading ? (
            <>
              <span
                className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current/25 border-t-current"
                aria-hidden
              />
              Redirection vers Discord…
            </>
          ) : (
            "Se connecter avec Discord"
          )}
        </button>
      </div>
    </div>
  );
}
