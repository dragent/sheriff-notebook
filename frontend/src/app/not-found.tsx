import Link from "next/link";
import { ROUTES } from "@/lib/routes";

/**
 * Page 404 : message clair et lien vers l'accueil.
 */
export default function NotFound() {
  return (
    <div
      className="sheriff-paper-bg flex min-h-[70vh] flex-1 flex-col items-center justify-center px-4"
      role="status"
      aria-label="Page introuvable"
    >
      <div className="sheriff-animate-in flex max-w-md flex-col items-center gap-6 text-center">
        <p className="font-heading-display text-6xl font-semibold text-sheriff-gold/80 sm:text-7xl" aria-hidden>
          404
        </p>
        <h1 className="font-heading text-xl font-semibold uppercase tracking-wider text-sheriff-gold sm:text-2xl">
          Page introuvable
        </h1>
        <p className="text-sm leading-relaxed text-sheriff-paper-muted">
          La ressource demandée n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href={ROUTES.HOME}
          className="sheriff-focus-ring sheriff-transition inline-flex items-center gap-2 rounded-md border-2 border-sheriff-gold/50 bg-sheriff-charcoal/60 px-5 py-2.5 text-sm font-medium text-sheriff-gold transition hover:border-sheriff-gold hover:bg-sheriff-gold/10 active:scale-[0.98]"
        >
          <span aria-hidden>←</span>
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
