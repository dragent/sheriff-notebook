import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export type ErrorStateVariant = "error" | "warning" | "config" | "neutral";

export type ErrorStateProps = {
  /** Titre principal */
  title: string;
  /** Description ou instructions */
  description?: string;
  /** Lien de l'action (défaut: accueil) */
  href?: string;
  /** Texte du lien (défaut: "Retour à l'accueil") */
  actionLabel?: string;
  /** Variante visuelle */
  variant?: ErrorStateVariant;
  /** Rôle ARIA (défaut: "alert") */
  role?: "alert" | "status";
};

const variantStyles: Record<
  ErrorStateVariant,
  { card: string; iconBg: string; iconColor: string }
> = {
  error:
    { card: "border-sheriff-sortie/50 bg-sheriff-sortie-bg", iconBg: "bg-sheriff-sortie/20", iconColor: "text-sheriff-sortie" },
  warning:
    { card: "border-[var(--sheriff-warning-border)] bg-[var(--sheriff-warning-bg)]", iconBg: "bg-[var(--sheriff-warning-icon-bg)]", iconColor: "text-[var(--sheriff-warning-icon)]" },
  config:
    { card: "border-[var(--sheriff-warning-border)] bg-[var(--sheriff-warning-bg)]", iconBg: "bg-[var(--sheriff-warning-icon-bg)]", iconColor: "text-[var(--sheriff-warning-icon)]" },
  /** Couleurs du thème dark (charcoal/wood/gold), sans teinte erreur/warning */
  neutral:
    { card: "border-sheriff-gold/25 bg-sheriff-charcoal/60 shadow-[inset_0_0_0_1px_rgba(184,184,184,0.06)]", iconBg: "bg-[var(--sheriff-warning-icon-bg)]", iconColor: "text-[var(--sheriff-warning-icon)]" },
};

const defaultIcon = (
  <svg
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

/**
 * Carte d'état d'erreur réutilisable : icône, titre, description, lien d'action.
 */
export function ErrorState({
  title,
  description,
  href = ROUTES.HOME,
  actionLabel = "Retour à l'accueil",
  variant = "error",
  role = "alert",
}: ErrorStateProps) {
  const { card, iconBg, iconColor } = variantStyles[variant];

  return (
    <div
      className={`sheriff-card flex flex-col items-center gap-4 rounded-lg px-6 py-10 text-center sm:px-8 sm:py-12 ${card}`}
      role={role}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg} ${iconColor}`}
        aria-hidden
      >
        {defaultIcon}
      </span>
      <div>
        <p className="font-medium text-sheriff-paper">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-sheriff-paper-muted">{description}</p>
        )}
      </div>
      <Link
        href={href}
        className="sheriff-focus-ring sheriff-btn-secondary mt-2 inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium active:scale-[0.98]"
      >
        <span aria-hidden>←</span>
        {actionLabel}
      </Link>
    </div>
  );
}
