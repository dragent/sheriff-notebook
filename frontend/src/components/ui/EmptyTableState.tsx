/**
 * État vide pour tableaux (icône + message).
 */
export function EmptyTableState({
  message = "Aucun enregistrement de service.",
  subtitle,
  className = "",
}: {
  message?: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div
      className={
        "flex min-h-48 flex-col items-center justify-center gap-2 px-4 py-10 " +
        "border-t border-sheriff-gold/20 bg-sheriff-charcoal/30 " +
        className
      }
      role="status"
      aria-label={message}
    >
      <span
        className="font-heading text-4xl text-sheriff-gold/50"
        aria-hidden
      >
        —
      </span>
      <p className="text-center text-sm font-medium text-sheriff-paper-muted">
        {message}
      </p>
      {subtitle && (
        <p className="text-center text-xs text-sheriff-paper-muted/80 max-w-sm">
          {subtitle}
        </p>
      )}
    </div>
  );
}
