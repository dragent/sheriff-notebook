import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { SectionOrnament } from "@/components/ui/SectionOrnament";

/**
 * 404 — RP "torn telegram" screen.
 * Western Union telegram visual (paper card, typewriter body) with a
 * "RETOUR EXPEDITEUR" red oxide stamp.
 */
export default function NotFound() {
  return (
    <div
      className="sheriff-paper-bg flex min-h-[70vh] flex-1 flex-col items-center justify-center px-4 py-10"
      role="status"
      aria-label="Page introuvable"
    >
      <article
        className="sheriff-card sheriff-card--paper sheriff-animate-in relative w-full max-w-xl overflow-hidden rounded-md border-sheriff-gold/40 px-6 py-8 sm:px-10 sm:py-10"
        aria-labelledby="not-found-heading"
      >
        {/* Telegram header — Western Union style */}
        <header className="text-center">
          <p className="font-stamp text-[10px] uppercase tracking-[0.4em] text-sheriff-brass sm:text-xs">
            Western Union Telegram
          </p>
          <p
            className="font-stamp mt-1 text-[10px] uppercase tracking-[0.18em] text-sheriff-paper-muted/80"
            aria-hidden
          >
            № AB-1899-404 · Comté de Roanoke Ridge
          </p>
        </header>

        <SectionOrnament tone="brass" className="mt-4" />

        <h1
          id="not-found-heading"
          className="font-heading-display mt-5 text-center text-2xl font-semibold uppercase tracking-wider text-sheriff-gold sm:text-3xl"
        >
          Destinataire inconnu
        </h1>

        <div className="font-stamp mt-6 space-y-2 text-center text-sm leading-relaxed text-sheriff-paper sm:text-base">
          <p>Page non archivée — STOP</p>
          <p>Adresse introuvable — STOP</p>
          <p>Retour à l’expéditeur — STOP</p>
        </div>

        {/* Red oxide stamp — slightly tilted, decorative. */}
        <p
          className="font-heading mx-auto mt-8 inline-block -rotate-6 rounded-sm border-2 border-sheriff-destructive-text/60 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-[0.18em] text-sheriff-destructive-text/80 sm:text-sm"
          aria-hidden
        >
          Retour expéditeur
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href={ROUTES.HOME}
            className="sheriff-focus-ring sheriff-transition sheriff-btn-secondary inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium"
          >
            <span aria-hidden>←</span>
            Retour au bureau
          </Link>
        </div>
      </article>
    </div>
  );
}
