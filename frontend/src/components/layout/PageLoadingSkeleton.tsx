import Link from "next/link";
import { ROUTES } from "@/lib/routes";

/**
 * Skeleton shown while a page segment loads (navigation / streaming).
 */
export function PageLoadingSkeleton() {
  return (
    <div
      className="sheriff-paper-bg flex min-h-[60vh] flex-1 flex-col"
      aria-busy="true"
      aria-label="Chargement de la page"
    >
      <section className="page-container flex flex-1 flex-col">
        <header className="mb-8">
          <Link
            href={ROUTES.HOME}
            className="sheriff-focus-ring mb-4 inline-flex items-center gap-1.5 text-sm text-sheriff-paper-muted transition hover:text-sheriff-gold"
          >
            <span aria-hidden>←</span>
            Accueil
          </Link>
          <div className="flex items-start gap-3 sm:gap-4">
            <span
              className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-lg border border-sheriff-gold/40 bg-sheriff-charcoal/80 text-sheriff-gold"
              aria-hidden
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 3h11l3 3v13H5z" />
                <path d="M9 8h6" />
                <path d="M9 12h6" />
                <path d="M9 16h3" />
              </svg>
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-7 w-32 animate-pulse rounded bg-sheriff-charcoal/60" />
              <div className="h-4 max-w-md animate-pulse rounded bg-sheriff-charcoal/40" />
              <div className="h-3 max-w-sm animate-pulse rounded bg-sheriff-charcoal/30" />
            </div>
          </div>
          <div className="sheriff-divider mt-6" aria-hidden />
        </header>

        <div className="flex flex-col gap-6">
          <div className="sheriff-card animate-pulse rounded-lg border border-sheriff-gold/30 bg-sheriff-charcoal/40 p-6">
            <div className="h-5 w-48 rounded bg-sheriff-charcoal/60" />
            <div className="mt-2 h-4 w-72 rounded bg-sheriff-charcoal/40" />
            <div className="mt-4 flex gap-2">
              <div className="h-9 w-32 rounded-md bg-sheriff-charcoal/50" />
              <div className="h-9 w-32 rounded-md bg-sheriff-charcoal/50" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="sheriff-card animate-pulse rounded-lg border border-sheriff-gold/30 bg-sheriff-charcoal/40 p-5">
              <div className="h-4 w-44 rounded bg-sheriff-charcoal/60" />
              <div className="mt-3 h-3 w-full rounded bg-sheriff-charcoal/40" />
              <div className="mt-4 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-2">
                    <div className="h-8 flex-1 rounded bg-sheriff-charcoal/50" />
                    <div className="h-8 w-16 rounded bg-sheriff-charcoal/50" />
                  </div>
                ))}
              </div>
            </div>
            <div className="sheriff-card animate-pulse rounded-lg border border-sheriff-gold/30 bg-sheriff-charcoal/40 p-5">
              <div className="h-4 w-40 rounded bg-sheriff-charcoal/60" />
              <div className="mt-3 h-3 w-full rounded bg-sheriff-charcoal/40" />
              <div className="mt-4 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-2">
                    <div className="h-8 flex-1 rounded bg-sheriff-charcoal/50" />
                    <div className="h-8 w-16 rounded bg-sheriff-charcoal/50" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
