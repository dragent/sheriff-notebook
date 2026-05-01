import { HomeLogo } from "@/components/home/HomeLogo";
import { SectionOrnament } from "@/components/ui/SectionOrnament";

/**
 * Bandeau hero de la page d'accueil (logo + sous-marquage registre + titre).
 */
export function HomeHero() {
  return (
    <header
      className="sheriff-animate-in flex flex-col items-center gap-5 py-8 sm:py-12"
      aria-label="Présentation du bureau"
    >
      <HomeLogo />
      <p
        className="font-stamp text-center text-[10px] uppercase tracking-[0.32em] text-sheriff-brass sm:text-xs"
        aria-hidden
      >
        Registre officiel · Comté de Roanoke Ridge · Est. 1899
      </p>
      <h1 className="font-heading-display text-center text-3xl font-semibold tracking-wide text-sheriff-gold sm:text-4xl md:text-[2.5rem]">
        Bureau du Shérif d&apos;Annesburg
      </h1>
      <SectionOrnament tone="brass" className="max-w-md" />
      <p className="max-w-lg text-center text-sm leading-relaxed text-sheriff-paper-muted sm:text-base">
        Registre officiel du bureau. Dossiers, planning et communication intercomté.
      </p>
    </header>
  );
}
