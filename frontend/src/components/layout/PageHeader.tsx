import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export type PageHeaderProps = {
  /** Titre de la page (h1) */
  title: string;
  /** Sous-titre ou description */
  subtitle?: string;
  /** Lien de retour (défaut: Accueil) */
  backHref?: string;
  /** Texte du lien retour (défaut: "Accueil") */
  backLabel?: string;
  /** Contenu optionnel après le titre (ex. badge, date) */
  extra?: React.ReactNode;
  /** Id pour aria-labelledby */
  headingId?: string;
  /** Icône SVG en React node (évite de dupliquer les paths) */
  icon: React.ReactNode;
  /** Sous-ligne optionnelle (ex. "Modifiable par…") */
  hint?: string;
  /** Enfants optionnels (ex. navigation par ancres) */
  children?: React.ReactNode;
};

/**
 * En-tête de page unifié : lien retour, icône, titre, sous-titre, divider.
 * Utilisé sur Profil, Référentiel, Destruction, Saisies, Comptabilité, Coffres.
 */
export function PageHeader({
  title,
  subtitle,
  backHref = ROUTES.HOME,
  backLabel = "Accueil",
  extra,
  headingId,
  icon,
  hint,
  children,
}: PageHeaderProps) {
  const id = headingId ?? title.toLowerCase().replace(/\s+/g, "-").replace(/[—–]/g, "").slice(0, 30);

  return (
    <header className="mb-8">
      <Link
        href={backHref}
        className="sheriff-focus-ring group mb-4 inline-flex items-center gap-1.5 text-sm text-sheriff-paper-muted transition hover:text-sheriff-gold"
      >
        <span
          className="transition-transform duration-200 group-hover:-translate-x-0.5"
          aria-hidden
        >
          ←
        </span>
        {backLabel}
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-sheriff-gold/40 bg-sheriff-charcoal/80 text-sheriff-gold shadow-sm"
            aria-hidden
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1
                id={id}
                className="font-heading text-xl font-semibold uppercase tracking-wider text-sheriff-gold sm:text-2xl"
              >
                {title}
              </h1>
              {extra != null && (
                <span className="text-sm font-normal normal-case text-sheriff-paper-muted">
                  {extra}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-sheriff-paper-muted sm:text-base">
                {subtitle}
              </p>
            )}
            {hint && (
              <p className="mt-1 text-xs text-sheriff-paper-muted/80">
                {hint}
              </p>
            )}
          </div>
        </div>
      </div>
      {children != null && <div className="mt-4">{children}</div>}
      <div className="sheriff-divider mt-6" aria-hidden />
    </header>
  );
}
