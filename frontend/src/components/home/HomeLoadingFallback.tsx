/**
 * Fallback Suspense pour la section connexion de la page d'accueil.
 */
export function HomeLoadingFallback() {
  return (
    <div
      className="flex flex-col items-center gap-6 py-8 sm:py-12"
      role="status"
      aria-live="polite"
      aria-label="Chargement du bureau"
    >
      <div
        className="h-24 w-48 animate-pulse rounded-lg bg-sheriff-gold/15 sm:h-32 sm:w-64"
        aria-hidden
      />
      <div className="flex flex-col items-center gap-2">
        <div
          className="h-8 w-64 animate-pulse rounded bg-sheriff-gold/20 sm:h-9 sm:w-80"
          aria-hidden
        />
        <div
          className="h-4 w-48 animate-pulse rounded bg-sheriff-gold/10"
          aria-hidden
        />
      </div>
      <p className="flex items-center gap-2 text-sm text-sheriff-paper-muted">
        <span
          className="inline-block h-3 w-3 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-sheriff-gold/60"
          aria-hidden
        />
        Chargement du bureau…
      </p>
    </div>
  );
}
