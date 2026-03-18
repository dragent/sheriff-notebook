"use client";

type Props = {
  isConnected?: boolean;
};

/**
 * Message affiché aux visiteurs non-sheriff connectés : annonce de recrutement et message d'accès réservé aux shérifs.
 * Non rendu pour les personnes non connectées.
 */
export function HomeRecruitmentOnly({ isConnected }: Props) {
  if (!isConnected) return null;

  return (
    <section
      className="sheriff-animate-in mx-auto flex max-w-xl flex-col items-center gap-6 py-6 text-center sm:py-8"
      aria-label="Recrutement"
    >
      <div className="w-full rounded-lg border border-sheriff-gold/25 bg-sheriff-charcoal/50 px-4 py-4 text-left shadow-sm">
        <p className="text-sm font-medium leading-relaxed text-sheriff-paper">
          Vous êtes connecté. L&apos;accès au tableau de bord (liste, planning, formations) est réservé aux shérifs.
        </p>
      </div>
      <div className="w-full rounded-lg border border-sheriff-gold/30 bg-sheriff-wood/90 px-5 py-5 shadow-md sm:px-6 sm:py-6">
        <h2 className="font-heading text-lg font-semibold uppercase tracking-wider text-sheriff-gold sm:text-xl">
          Recrutement
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-sheriff-paper sm:text-lg">
          Le Bureau du Shérif d&apos;Annesburg recrute !{"\n"}
          Présentez-vous au Bureau ou par tlg au 2327.
        </p>
      </div>
    </section>
  );
}
