"use client";

import { SectionTable } from "@/components/ui/SectionTable";
import { resolveRowGrade, GRADE_ORDER } from "@/lib/grades";
import { canEditFormation } from "@/lib/dashboardPermissions";
import type { ServiceRecordFull } from "@/components/dashboard/Dashboard";
import type { BureauRow } from "@/components/dashboard/dashboardShared";

type Formation = { id: string; label: string; maxGradeOrder?: number };

type Props = {
  bureauRows: BureauRow[];
  sheriffsCount: number;
  displayFormations: Formation[];
  currentGrade?: string | null;
  currentUsername?: string | null;
  updating: string | null;
  onPatchRecord: (id: string, payload: Partial<ServiceRecordFull>) => Promise<void>;
};

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 1a3.5 3.5 0 0 1 3.5 3.5v2h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h1v-2A3.5 3.5 0 0 1 8 1zm2 5.5v-2a2 2 0 1 0-4 0v2h4z" />
    </svg>
  );
}

function ciEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.localeCompare(b, undefined, { sensitivity: "base" }) === 0;
}

/** "Formations" tab — grid of (sheriff × formation) toggles, gated by grade. */
export function DashboardFormationsTab({
  bureauRows,
  sheriffsCount,
  displayFormations,
  currentGrade,
  currentUsername,
  updating,
  onPatchRecord,
}: Props) {
  return (
    <div role="tabpanel" aria-label="Formations du bureau">
      <SectionTable
        title="Formations"
        description="Toutes les formations sont visibles. Cadenas si vous n'avez pas le grade pour valider. Pour soi : uniquement Sheriff de comté."
        columns={[
          {
            key: "nom",
            label: "NOM",
            headerClassName:
              "sticky left-0 z-10 w-36 shrink-0 bg-sheriff-charcoal/95 sheriff-sticky-col-shadow",
          },
          ...displayFormations.map((f) => ({
            key: f.id,
            label: f.label || "(sans nom)",
            align: "center" as const,
            headerClassName: "px-1",
          })),
        ]}
        emptyMessage="Aucun shérif."
        emptySubtitle="Les formations validées s'afficheront ici par shérif."
        footer={
          sheriffsCount > 0
            ? "Glissez horizontalement pour parcourir toutes les formations visibles pour le bureau."
            : undefined
        }
      >
        {bureauRows.map(({ sheriff, record: r }) => (
          <tr
            key={r?.id ?? `sheriff-${sheriff.username}`}
            className="group transition hover:bg-sheriff-gold/5"
          >
            <td className="sticky left-0 z-1 w-36 shrink-0 whitespace-nowrap bg-sheriff-wood px-2 py-2 font-medium text-sheriff-paper sheriff-sticky-col-shadow group-hover:bg-sheriff-gold/5">
              {sheriff.username}
            </td>
            {displayFormations.map((f) => {
              const targetGrade = r
                ? resolveRowGrade(r.grade, sheriff.grade)
                : resolveRowGrade(undefined, sheriff.grade);
              const targetGradeOrder = targetGrade != null ? GRADE_ORDER[targetGrade] ?? null : null;
              const currentUserOrder =
                currentGrade != null ? GRADE_ORDER[currentGrade] ?? null : null;
              const maxGradeOrder = typeof f.maxGradeOrder === "number" ? f.maxGradeOrder : 4;
              const formationAppliesToRow =
                targetGradeOrder === null || maxGradeOrder >= targetGradeOrder;
              const lockedByGrade =
                currentUserOrder !== null && currentUserOrder > maxGradeOrder;
              const isOwnRow = r ? ciEquals(r.name, currentUsername) : false;
              const editable = r
                ? canEditFormation(currentGrade, targetGrade, maxGradeOrder, isOwnRow)
                : false;
              let disabledReason: string | undefined;
              if (lockedByGrade) {
                disabledReason = "Formation réservée à un grade supérieur au vôtre.";
              } else if (r && isOwnRow && !editable) {
                disabledReason = "Seul le Sheriff de comté peut valider ses propres formations.";
              }
              const value = r?.formationValidations?.[f.id] === true;
              return (
                <td key={f.id} className="px-1 py-2 text-center">
                  {!formationAppliesToRow ? (
                    <span
                      className="inline-flex items-center justify-center text-sheriff-paper-muted"
                      title="Formation non applicable à ce grade."
                    >
                      <LockIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    </span>
                  ) : r ? (
                    editable ? (
                      <input
                        type="checkbox"
                        checked={value}
                        disabled={updating === r.id}
                        onChange={() =>
                          onPatchRecord(r.id, {
                            formationValidations: {
                              ...(r.formationValidations ?? {}),
                              [f.id]: !value,
                            },
                          })
                        }
                        className="sheriff-checkbox inline-block align-middle"
                        aria-label={f.label || "(sans nom)"}
                      />
                    ) : lockedByGrade ? (
                      <span
                        className="inline-flex items-center justify-center text-sheriff-paper-muted"
                        title={disabledReason ?? "Formation réservée à un grade supérieur au vôtre."}
                      >
                        <LockIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center justify-center text-sheriff-paper-muted"
                        title={disabledReason ?? "Vous n'avez pas le grade pour valider cette formation."}
                      >
                        {value ? "✓" : "—"}
                      </span>
                    )
                  ) : (
                    <span className="text-sheriff-paper-muted">{value ? "✓" : "—"}</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </SectionTable>
    </div>
  );
}
