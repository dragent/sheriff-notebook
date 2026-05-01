"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Erreur globale (root layout failed) — rendue en standalone (pas de Providers,
 * pas de Navbar, pas de PageHeader).
 *
 * On envoie l'erreur à Sentry puis on affiche un télégramme barré en HTML
 * inline (les CSS variables du thème ne sont pas garanties à ce niveau, donc
 * on inline les couleurs de la palette dark pour rester safe).
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background:
            "radial-gradient(800px 400px at 50% 30%, rgba(72,58,44,0.4), rgba(0,0,0,0) 60%), #0f0c09",
          color: "#ebe8e2",
          fontFamily:
            '"Source Sans 3", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <article
          style={{
            maxWidth: "32rem",
            width: "100%",
            border: "1px solid rgba(184,153,104,0.4)",
            borderRadius: "0.5rem",
            padding: "2.5rem 2rem",
            background:
              "linear-gradient(180deg, rgba(34,28,22,0.94), rgba(20,16,12,0.92))",
            boxShadow: "0 16px 42px rgba(0,0,0,0.48)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily:
                '"Special Elite", "Courier New", ui-monospace, monospace',
              fontSize: "0.7rem",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              color: "rgba(184,153,104,0.9)",
              margin: 0,
            }}
          >
            Western Union Telegram
          </p>
          <p
            style={{
              fontFamily:
                '"Special Elite", "Courier New", ui-monospace, monospace',
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              color: "rgba(232,226,216,0.55)",
              marginTop: "0.25rem",
              marginBottom: "1.5rem",
            }}
          >
            № AB-1899-500 · Comté de Roanoke Ridge
          </p>

          <h1
            style={{
              fontFamily: '"IM Fell English SC", Georgia, serif',
              fontSize: "1.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "#d6b85f",
              margin: "0 0 1.5rem 0",
            }}
          >
            Ligne télégraphique coupée
          </h1>

          <div
            style={{
              fontFamily:
                '"Special Elite", "Courier New", ui-monospace, monospace',
              fontSize: "0.95rem",
              lineHeight: 1.6,
              color: "rgba(232,226,216,0.92)",
            }}
          >
            <p style={{ margin: "0.25rem 0" }}>Erreur critique au bureau — STOP</p>
            <p style={{ margin: "0.25rem 0" }}>Le télégraphe ne répond pas — STOP</p>
            <p style={{ margin: "0.25rem 0" }}>Veuillez tenter une nouvelle dépêche — STOP</p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              marginTop: "2rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: "0.375rem",
                border: "2px solid #b89968",
                background: "#b89968",
                color: "#1a1410",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Renvoyer la dépêche
            </button>
            <Link
              href="/"
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: "0.375rem",
                border: "1px solid rgba(184,153,104,0.5)",
                color: "rgba(232,226,216,0.92)",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              Retour au bureau
            </Link>
          </div>
        </article>
      </body>
    </html>
  );
}
