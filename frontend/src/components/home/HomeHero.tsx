import { HomeLogo } from "@/components/home/HomeLogo";

/**
 * Bandeau hero de la page d'accueil (logo + titre).
 */
export function HomeHero() {
  return (
    <header
      className="sheriff-animate-in flex flex-col items-center gap-5 py-8 sm:py-12"
      aria-label="Présentation du bureau"
    >
      <div className="flex flex-col items-center gap-1">
        <HomeLogo />
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-sheriff-gold/50 to-transparent" aria-hidden />
      </div>
      <h1 className="font-heading-display text-center text-3xl font-semibold tracking-wide text-sheriff-gold sm:text-4xl md:text-[2.5rem]">
        Bureau du Shérif d&apos;Annesburg
      </h1>
      <p className="max-w-lg text-center text-sm leading-relaxed text-sheriff-paper-muted sm:text-base">
        Registre officiel du bureau. Dossiers, planning et communication intercomté.
      </p>
    </header>
  );
}
