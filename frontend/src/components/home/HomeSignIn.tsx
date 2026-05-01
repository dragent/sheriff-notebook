"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { HomeLogo } from "@/components/home/HomeLogo";
import { Flashbag, AUTH_ERROR_MESSAGES } from "@/components/feedback/Flashbag";
import { ROUTES } from "@/lib/routes";
import { SectionOrnament } from "@/components/ui/SectionOrnament";

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
          <p
            className="font-stamp text-center text-[10px] uppercase tracking-[0.32em] text-sheriff-brass sm:text-xs"
            aria-hidden
          >
            Registre officiel · Comté de Roanoke Ridge · Est. 1899
          </p>
          <h1 className="font-heading-display text-center text-3xl font-semibold tracking-wide text-sheriff-gold sm:text-4xl">
            Bureau du Shérif d&apos;Annesburg
          </h1>
          <SectionOrnament tone="brass" className="max-w-md" />
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
            <>
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
                focusable="false"
              >
                <path d="M19.27 5.33A18.84 18.84 0 0 0 14.5 3.9a13.7 13.7 0 0 0-.62 1.27 17.4 17.4 0 0 0-5.27 0c-.18-.43-.4-.86-.62-1.27a18.78 18.78 0 0 0-4.78 1.43A19.7 19.7 0 0 0 .35 18.04a18.94 18.94 0 0 0 5.7 2.86c.46-.62.87-1.28 1.22-1.97a12.2 12.2 0 0 1-1.92-.92c.16-.12.32-.24.47-.37a13.5 13.5 0 0 0 11.96 0c.15.13.31.25.47.37-.6.36-1.25.67-1.92.92.35.69.76 1.35 1.22 1.97a18.91 18.91 0 0 0 5.7-2.86 19.66 19.66 0 0 0-2.39-12.71ZM8.02 15.33c-1.13 0-2.06-1.04-2.06-2.31 0-1.27.91-2.31 2.06-2.31 1.15 0 2.08 1.04 2.06 2.31 0 1.27-.91 2.31-2.06 2.31Zm7.96 0c-1.13 0-2.06-1.04-2.06-2.31 0-1.27.91-2.31 2.06-2.31 1.15 0 2.08 1.04 2.06 2.31 0 1.27-.91 2.31-2.06 2.31Z" />
              </svg>
              Se connecter avec Discord
            </>
          )}
        </button>
      </div>
    </div>
  );
}
