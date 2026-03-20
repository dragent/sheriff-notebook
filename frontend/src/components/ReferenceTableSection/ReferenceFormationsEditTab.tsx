"use client";

import type { ReferenceData } from "@/lib/reference";
import { GRADE_ORDER } from "@/lib/grades";
import {
  TABLE_CARD_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_CELL_CLASS,
  TABLE_CELL_LAST,
} from "./shared";

const INPUT_CLASS =
  "w-full rounded border border-sheriff-gold/30 bg-sheriff-charcoal/50 px-3 py-2 text-sm text-sheriff-paper placeholder:text-sheriff-paper-muted/60 focus:border-sheriff-gold/60 focus:outline-none focus:ring-1 focus:ring-sheriff-gold/30";

type Props = {
  draft: ReferenceData;
  setDraft: React.Dispatch<React.SetStateAction<ReferenceData>>;
  formationTableGrades: string[];
  onSave: (
    payload?: ReferenceData,
    options?: { keepEditing?: boolean }
  ) => void;
  draftRef: React.MutableRefObject<ReferenceData>;
};

export function ReferenceFormationsEditTab({
  draft,
  setDraft,
  formationTableGrades,
  onSave,
  draftRef,
}: Props) {
  return (
    <div className="space-y-6 pt-4">
      <p className="text-xs text-sheriff-paper-muted/90">
        Tableau : une ligne par formation, une colonne par grade. Cochez les
        grades pour lesquels la formation est requise (les rangs supérieurs
        héritent des formations des rangs inférieurs).
      </p>
      <section className={TABLE_CARD_CLASS}>
        <h2 className={TABLE_HEAD_CLASS}>Catalogue des formations</h2>
        <div className="sheriff-table-scroll overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                <th scope="col" className={TABLE_HEAD_CLASS}>
                  Formation
                </th>
                {formationTableGrades.map((grade) => (
                  <th key={grade} scope="col" className={TABLE_HEAD_CLASS}>
                    {grade}
                  </th>
                ))}
                <th
                  scope="col"
                  className={TABLE_HEAD_CLASS + " w-12"}
                  aria-label="Supprimer"
                />
              </tr>
            </thead>
            <tbody>
              {(draft.formations ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={formationTableGrades.length + 2}
                    className={
                      TABLE_CELL_CLASS +
                      " " +
                      TABLE_CELL_LAST +
                      " text-sheriff-paper-muted"
                    }
                  >
                    Aucune formation. Utilisez le bouton ci-dessous pour en
                    ajouter.
                  </td>
                </tr>
              )}
              {(draft.formations ?? []).map((f, idx) => {
                const formationIdsByGrade = (draft.formationsByGrade ?? []).reduce(
                  (acc, cfg) => {
                    acc[cfg.grade] = new Set(cfg.formationIds ?? []);
                    return acc;
                  },
                  {} as Record<string, Set<string>>
                );
                const isLastRow =
                  idx === (draft.formations ?? []).length - 1;
                const cellClass =
                  TABLE_CELL_CLASS + (isLastRow ? " " + TABLE_CELL_LAST : "");
                return (
                  <tr key={f.id}>
                    <td className={cellClass}>
                      <input
                        type="text"
                        value={f.label}
                        onChange={(e) => {
                          const next = [...(draft.formations ?? [])];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setDraft((d) => ({ ...d, formations: next }));
                        }}
                        onBlur={(e) => {
                          const newLabel = (
                            e.target as HTMLInputElement
                          ).value;
                          const current = draftRef.current;
                          const nextFormations = (
                            current.formations ?? []
                          ).map((form, i) =>
                            i === idx
                              ? { ...form, label: newLabel }
                              : form
                          );
                          onSave(
                            { ...current, formations: nextFormations },
                            { keepEditing: true }
                          );
                        }}
                        placeholder="Nom de la formation"
                        className={INPUT_CLASS + " w-full min-w-32"}
                      />
                    </td>
                    {formationTableGrades.map((grade) => {
                      const checked =
                        formationIdsByGrade[grade]?.has(f.id) ?? false;
                      return (
                        <td
                          key={grade}
                          className={cellClass + " text-center"}
                        >
                          <label className="inline-flex cursor-pointer items-center justify-center">
                            <input
                              type="checkbox"
                              className="sheriff-checkbox focus:ring-0"
                              checked={checked}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setDraft((d) => {
                                  const existing =
                                    d.formationsByGrade ?? [];
                                  const orderToggled =
                                    GRADE_ORDER[grade] ?? 99;
                                  let nextByGrade: ReferenceData["formationsByGrade"];
                                  if (isChecked) {
                                    const gradesToAdd =
                                      formationTableGrades.filter(
                                        (g) =>
                                          (GRADE_ORDER[g] ?? 99) <=
                                          orderToggled
                                      );
                                    let next =
                                      existing.length ? [...existing] : [];
                                    for (const g of gradesToAdd) {
                                      const i = next.findIndex(
                                        (c) => c.grade === g
                                      );
                                      const currentIds =
                                        i >= 0
                                          ? [...(next[i].formationIds ?? [])]
                                          : [];
                                      if (!currentIds.includes(f.id)) {
                                        const newIds = [
                                          ...currentIds,
                                          f.id,
                                        ];
                                        if (i >= 0)
                                          next[i] = {
                                            ...next[i],
                                            formationIds: newIds,
                                          };
                                        else
                                          next = [
                                            ...next,
                                            { grade: g, formationIds: newIds },
                                          ];
                                      }
                                    }
                                    nextByGrade = next;
                                  } else {
                                    const index = existing.findIndex(
                                      (cfg) => cfg.grade === grade
                                    );
                                    if (index < 0) return d;
                                    const currentIds =
                                      existing[index].formationIds ?? [];
                                    const nextIds = currentIds.filter(
                                      (id) => id !== f.id
                                    );
                                    const next = [...existing];
                                    if (nextIds.length === 0)
                                      next.splice(index, 1);
                                    else
                                      next[index] = {
                                        grade,
                                        formationIds: nextIds,
                                      };
                                    nextByGrade = next;
                                  }
                                  const nextDraft = {
                                    ...d,
                                    formationsByGrade: nextByGrade,
                                  };
                                  queueMicrotask(() =>
                                    onSave(nextDraft, {
                                      keepEditing: true,
                                    })
                                  );
                                  return nextDraft;
                                });
                              }}
                            />
                          </label>
                        </td>
                      );
                    })}
                    <td className={cellClass}>
                      <button
                        type="button"
                        onClick={() => {
                          const nextFormations = (
                            draft.formations ?? []
                          ).filter((x) => x.id !== f.id);
                          const nextByGrade = (draft.formationsByGrade ?? [])
                            .map((cfg) => ({
                              ...cfg,
                              formationIds: (
                                cfg.formationIds ?? []
                              ).filter((id) => id !== f.id),
                            }))
                            .filter(
                              (cfg) => (cfg.formationIds?.length ?? 0) > 0
                            );
                          setDraft((d) => ({
                            ...d,
                            formations: nextFormations,
                            formationsByGrade: nextByGrade,
                          }));
                        }}
                        className="sheriff-focus-ring sheriff-btn-destructive-icon rounded p-1.5"
                        title="Supprimer"
                        aria-label="Supprimer"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-sheriff-gold/15 px-4 py-2">
            <button
              type="button"
              onClick={() => {
                const id =
                  typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID()
                    : "formation-" + Date.now();
                setDraft((d) => ({
                  ...d,
                  formations: [
                    ...(d.formations ?? []),
                    { id, label: "" },
                  ],
                }));
              }}
              className="sheriff-focus-ring rounded border border-dashed border-sheriff-gold/40 bg-sheriff-charcoal/30 px-3 py-1.5 text-sm text-sheriff-gold/90 transition hover:border-sheriff-gold/60 hover:bg-sheriff-gold/10"
            >
              + Ajouter une formation
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
