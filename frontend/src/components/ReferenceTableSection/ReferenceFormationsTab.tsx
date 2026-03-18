"use client";

import type { FormationCatalogItem, FormationGradeConfig } from "@/lib/reference";
import { SectionTable } from "@/components/ui/SectionTable";
import { TABLE_CELL_CLASS, TABLE_CELL_LAST } from "./shared";

type Props = {
  formations: FormationCatalogItem[];
  formationsByGrade: FormationGradeConfig[];
  formationTableGrades: string[];
};

export function ReferenceFormationsTab({
  formations,
  formationsByGrade,
  formationTableGrades,
}: Props) {
  return (
    <SectionTable
      title="Formations par grade"
      description="Catalogue des formations et assignation par grade. Les rangs supérieurs héritent des formations des rangs inférieurs."
      columns={[
        { key: "formation", label: "Formation" },
        ...formationTableGrades.map((grade) => ({
          key: grade,
          label: grade,
          align: "center" as const,
        })),
      ]}
      emptyMessage="Aucune formation n'a encore été créée."
      emptySubtitle="Cliquez sur « Modifier les informations » puis onglet Formations : créez d'abord des formations dans le catalogue, puis assignez-les par grade."
      forceEmpty={
        formations.length === 0 && formationsByGrade.length === 0
      }
    >
      {formations.length === 0 && formationsByGrade.length > 0 ? (
        <tr>
          <td
            colSpan={formationTableGrades.length + 1}
            className={
              TABLE_CELL_CLASS +
              " " +
              TABLE_CELL_LAST +
              " text-sheriff-paper-muted"
            }
          >
            Aucune formation dans le catalogue.
          </td>
        </tr>
      ) : (
        formations.map((f, rowIdx) => {
          const idsByGrade = formationsByGrade.reduce(
            (acc, cfg) => {
              acc[cfg.grade] = new Set(cfg.formationIds ?? []);
              return acc;
            },
            {} as Record<string, Set<string>>
          );
          const isLastRow = rowIdx === formations.length - 1;
          const cellClass =
            TABLE_CELL_CLASS + (isLastRow ? " " + TABLE_CELL_LAST : "");
          return (
            <tr key={f.id}>
              <td className={cellClass + " font-medium text-sheriff-paper"}>
                {f.label || "(sans nom)"}
              </td>
              {formationTableGrades.map((grade) => (
                <td key={grade} className={cellClass + " text-center"}>
                  {idsByGrade[grade]?.has(f.id) ? (
                    <span className="text-sheriff-gold" aria-hidden>
                      ✓
                    </span>
                  ) : (
                    <span className="text-sheriff-paper-muted/50">—</span>
                  )}
                </td>
              ))}
            </tr>
          );
        })
      )}
    </SectionTable>
  );
}
