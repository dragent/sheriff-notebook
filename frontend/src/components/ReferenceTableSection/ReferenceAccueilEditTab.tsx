"use client";

import type { ReferenceData } from "@/lib/reference";
import { Chevron, TABLE_CARD_CLASS, TABLE_HEAD_CLASS } from "./shared";

const INPUT_CLASS =
  "w-full rounded border border-sheriff-gold/30 bg-sheriff-charcoal/50 px-3 py-2 text-sm text-sheriff-paper placeholder:text-sheriff-paper-muted/60 focus:border-sheriff-gold/60 focus:outline-none focus:ring-1 focus:ring-sheriff-gold/30";

type Props = {
  draft: ReferenceData;
  setDraft: React.Dispatch<React.SetStateAction<ReferenceData>>;
  openHomeCategoryIds: Set<string>;
  setOpenHomeCategoryIds: React.Dispatch<React.SetStateAction<Set<string>>>;
};

export function ReferenceAccueilEditTab({
  draft,
  setDraft,
  openHomeCategoryIds,
  setOpenHomeCategoryIds,
}: Props) {
  return (
    <div className="space-y-6 pt-4">
      <p className="text-xs text-sheriff-paper-muted/90">
        Catégories et blocs d&apos;information affichés sur la page
        d&apos;accueil. Créez des catégories puis des informations (titre +
        contenu) dans chacune.
      </p>
      {(draft.homeInfoCategories ?? []).map((cat, catIndex) => {
        const isOpen = openHomeCategoryIds.has(cat.id);
        return (
          <section key={cat.id} className={TABLE_CARD_CLASS}>
            <div className="flex items-center gap-2 border-b border-sheriff-gold/40 bg-sheriff-charcoal/80 px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  setOpenHomeCategoryIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(cat.id)) next.delete(cat.id);
                    else next.add(cat.id);
                    return next;
                  });
                }}
                className="sheriff-focus-ring flex flex-1 items-center gap-2 rounded py-1 text-left font-heading text-xs font-semibold uppercase tracking-wider text-sheriff-gold hover:bg-sheriff-gold/10"
                aria-expanded={isOpen}
              >
                <Chevron open={isOpen} />
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => {
                    const next = (draft.homeInfoCategories ?? []).map(
                      (c, i) =>
                        i === catIndex
                          ? { ...c, name: e.target.value }
                          : c
                    );
                    setDraft((d) => ({
                      ...d,
                      homeInfoCategories: next,
                    }));
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Nom de la catégorie"
                  className={
                    INPUT_CLASS +
                    " flex-1 font-heading text-xs font-semibold uppercase tracking-wider text-sheriff-gold placeholder:text-sheriff-gold/50"
                  }
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft((d) => ({
                    ...d,
                    homeInfoCategories: (d.homeInfoCategories ?? []).filter(
                      (c) => c.id !== cat.id
                    ),
                  }));
                  setOpenHomeCategoryIds((prev) => {
                    const next = new Set(prev);
                    next.delete(cat.id);
                    return next;
                  });
                }}
                className="sheriff-focus-ring sheriff-btn-destructive-icon rounded p-1.5"
                title="Supprimer la catégorie"
                aria-label="Supprimer la catégorie"
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
            </div>
            {isOpen && (
              <div className="px-4 py-3">
                <div className="space-y-3">
                  {(cat.infos ?? []).map((info, index) => (
                    <div
                      key={info.id}
                      className="rounded border border-sheriff-gold/20 bg-sheriff-charcoal/30 p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={info.title}
                          onChange={(e) => {
                            const next = [...(draft.homeInfoCategories ?? [])];
                            const infos = [...(next[catIndex].infos ?? [])];
                            infos[index] = {
                              ...infos[index],
                              title: e.target.value,
                            };
                            next[catIndex] = {
                              ...next[catIndex],
                              infos,
                            };
                            setDraft((d) => ({
                              ...d,
                              homeInfoCategories: next,
                            }));
                          }}
                          placeholder="Titre (ex. Présence requise)"
                          className={INPUT_CLASS + " flex-1"}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = [
                              ...(draft.homeInfoCategories ?? []),
                            ];
                            next[catIndex] = {
                              ...next[catIndex],
                              infos: (
                                next[catIndex].infos ?? []
                              ).filter((_, i) => i !== index),
                            };
                            setDraft((d) => ({
                              ...d,
                              homeInfoCategories: next,
                            }));
                          }}
                          className="sheriff-focus-ring sheriff-btn-destructive-icon shrink-0 rounded p-1.5"
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
                      </div>
                      <textarea
                        value={info.content}
                        onChange={(e) => {
                          const next = [...(draft.homeInfoCategories ?? [])];
                          const infos = [...(next[catIndex].infos ?? [])];
                          infos[index] = {
                            ...infos[index],
                            content: e.target.value,
                          };
                          next[catIndex] = {
                            ...next[catIndex],
                            infos,
                          };
                          setDraft((d) => ({
                            ...d,
                            homeInfoCategories: next,
                          }));
                        }}
                        placeholder="Contenu (texte libre, sauts de ligne conservés)"
                        rows={3}
                        className={INPUT_CLASS + " resize-y"}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const id =
                        typeof crypto !== "undefined" && crypto.randomUUID
                          ? crypto.randomUUID()
                          : "info-" + Date.now();
                      const next = [...(draft.homeInfoCategories ?? [])];
                      next[catIndex] = {
                        ...next[catIndex],
                        infos: [
                          ...(next[catIndex].infos ?? []),
                          { id, title: "", content: "" },
                        ],
                      };
                      setDraft((d) => ({
                        ...d,
                        homeInfoCategories: next,
                      }));
                    }}
                    className="sheriff-focus-ring rounded border border-dashed border-sheriff-gold/40 bg-sheriff-charcoal/30 px-3 py-2 text-sm text-sheriff-gold/90 transition hover:border-sheriff-gold/60 hover:bg-sheriff-gold/10"
                  >
                    + Ajouter une information
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}
      <button
        type="button"
        onClick={() => {
          const id =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : "homecat-" + Date.now();
          setDraft((d) => ({
            ...d,
            homeInfoCategories: [
              ...(d.homeInfoCategories ?? []),
              { id, name: "Nouvelle catégorie", infos: [] },
            ],
          }));
          setOpenHomeCategoryIds((prev) => new Set(prev).add(id));
        }}
        className="sheriff-focus-ring w-full rounded border border-dashed border-sheriff-gold/40 bg-sheriff-charcoal/30 px-3 py-3 text-sm text-sheriff-gold/90 transition hover:border-sheriff-gold/60 hover:bg-sheriff-gold/10"
      >
        + Ajouter une catégorie
      </button>
    </div>
  );
}
