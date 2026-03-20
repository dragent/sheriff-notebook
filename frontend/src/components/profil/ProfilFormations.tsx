"use client";

export type AllowedFormation = { id: string; label: string };

type ProfilFormationsProps = {
  allowedFormations: AllowedFormation[];
  formationValidations: Record<string, boolean>;
};

/**
 * Icône « à apprendre ».
 */
function IconToLearn({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

/**
 * Icône « validé ».
 */
function IconValidated({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

/**
 * Bloc formations : à apprendre et validées (selon grade).
 */
export function ProfilFormations({
  allowedFormations,
  formationValidations,
}: ProfilFormationsProps) {
  const toLearn = allowedFormations.filter((f) => !formationValidations[f.id]);
  const validated = allowedFormations.filter((f) => formationValidations[f.id] === true);
  const totalAllowed = allowedFormations.length;
  const progressPercent = totalAllowed > 0 ? Math.round((validated.length / totalAllowed) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Barre de progression globale */}
      <div className="rounded-lg border border-sheriff-gold/25 bg-sheriff-charcoal/40 px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-sheriff-paper">Progression des formations</span>
          <span className="text-sm tabular-nums text-sheriff-paper-muted">
            {validated.length} / {totalAllowed} validées
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-sheriff-charcoal/80"
          role="progressbar"
          aria-valuenow={validated.length}
          aria-valuemin={0}
          aria-valuemax={totalAllowed}
          aria-label={`${validated.length} formations validées sur ${totalAllowed}`}
        >
          <div
            className="h-full rounded-full bg-sheriff-gold/70 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

    <div className="grid gap-6 sm:grid-cols-2">
      <div className="sheriff-section-pending relative overflow-hidden rounded-lg border shadow-[inset_0_0_0_1px_rgba(197,199,204,0.1)]">
        <div className="sheriff-section-pending-bar absolute left-0 top-0 h-full w-1" aria-hidden />
        <div className="sheriff-section-pending-head flex items-center gap-2 border-b px-4 py-3">
          <span className="sheriff-section-pending-accent sheriff-section-pending-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sheriff-gold/35">
            <IconToLearn className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-sheriff-paper">
              À apprendre (à votre grade)
            </h3>
            {toLearn.length > 0 && (
              <p className="text-xs text-sheriff-paper-muted">
                {toLearn.length} formation{toLearn.length > 1 ? "s" : ""} à valider
              </p>
            )}
          </div>
        </div>
        <div className="relative px-4 py-3">
          {toLearn.length === 0 ? (
            <p className="text-sm text-sheriff-paper-muted">
              Aucune formation en attente — vous avez validé toutes les formations accessibles à votre grade.
            </p>
          ) : (
            <ul className="space-y-2" role="list">
              {toLearn.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded-md border border-sheriff-gold/25 bg-sheriff-charcoal/35 py-2 pl-3 pr-3"
                >
                  <span
                    className="sheriff-section-pending-icon flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-sheriff-gold/30 bg-sheriff-gold/10"
                    aria-hidden
                  >
                    <IconToLearn className="h-3 w-3" />
                  </span>
                  <span className="text-sm font-medium text-sheriff-paper">
                    {f.label || "(sans nom)"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="sheriff-section-validated relative overflow-hidden rounded-lg border">
        <div className="sheriff-section-validated-bar absolute left-0 top-0 h-full w-1" aria-hidden />
        <div className="sheriff-section-validated-head flex items-center gap-2 border-b px-4 py-3">
          <span className="sheriff-section-validated-accent sheriff-section-validated-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sheriff-entree/35">
            <IconValidated className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-sheriff-paper">
              Validées
            </h3>
            {validated.length > 0 && (
              <p className="text-xs text-sheriff-paper-muted">
                {validated.length} formation{validated.length > 1 ? "s" : ""} obtenue{validated.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <div className="relative px-4 py-3">
          {validated.length === 0 ? (
            <p className="text-sm text-sheriff-paper-muted">
              Aucune formation validée pour l’instant.
            </p>
          ) : (
            <ul className="space-y-2" role="list">
              {validated.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded-md border border-sheriff-entree/25 bg-sheriff-charcoal/35 py-2 pl-3 pr-3"
                >
                  <span
                    className="sheriff-section-validated-icon flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-sheriff-entree/30 bg-sheriff-entree/10"
                    aria-hidden
                  >
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-sheriff-paper">
                    {f.label || "(sans nom)"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
