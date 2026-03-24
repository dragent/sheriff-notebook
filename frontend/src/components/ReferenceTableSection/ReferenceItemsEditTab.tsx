"use client";

import type { ReferenceData } from "@/lib/reference";
import { Chevron, TABLE_CARD_CLASS, TABLE_HEAD_CLASS } from "./shared";

const INPUT_CLASS =
  "w-full rounded border border-sheriff-gold/30 bg-sheriff-charcoal/50 px-3 py-2 text-sm text-sheriff-paper placeholder:text-sheriff-paper-muted/60 focus:border-sheriff-gold/60 focus:outline-none focus:ring-1 focus:ring-sheriff-gold/30";

type Props = {
  draft: ReferenceData;
  setDraft: React.Dispatch<React.SetStateAction<ReferenceData>>;
  openCategoryIds: Set<string>;
  setOpenCategoryIds: React.Dispatch<React.SetStateAction<Set<string>>>;
};

export function ReferenceItemsEditTab({
  draft,
  setDraft,
  openCategoryIds,
  setOpenCategoryIds,
}: Props) {
  return (
    <div className="space-y-6 pt-4">
      <p className="text-xs text-sheriff-paper-muted/90">
        Cliquez sur une catégorie pour l&apos;ouvrir ou la fermer. Vous pouvez
        créer et supprimer des catégories, et modifier les items dans chaque
        catégorie.
      </p>
      {(draft.itemCategories ?? []).map((cat, catIndex) => {
        const isOpen = openCategoryIds.has(cat.id);
        return (
          <section key={cat.id} className={TABLE_CARD_CLASS}>
            <div className="flex items-center gap-2 border-b border-sheriff-gold/40 bg-sheriff-charcoal/80 px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  setOpenCategoryIds((prev) => {
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
                    const next = draft.itemCategories.map((c, i) =>
                      i === catIndex ? { ...c, name: e.target.value } : c
                    );
                    setDraft((d) => ({ ...d, itemCategories: next }));
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
                    itemCategories: d.itemCategories.filter(
                      (c) => c.id !== cat.id
                    ),
                  }));
                  setOpenCategoryIds((prev) => {
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
                  <div className="sheriff-table-scroll overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th scope="col" className={TABLE_HEAD_CLASS}>
                            Item
                          </th>
                          <th scope="col" className={TABLE_HEAD_CLASS}>
                            Valeur destruction ($)
                          </th>
                          <th
                            scope="col"
                            className={TABLE_HEAD_CLASS + " w-12"}
                            aria-label="Supprimer"
                          />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sheriff-gold/15">
                        {(cat.items ?? []).map((item, index) => (
                          <tr key={index} className="align-top">
                            <td className="py-1.5 pr-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const next = [...draft.itemCategories];
                                  const items = [...next[catIndex].items];
                                  items[index] = {
                                    ...items[index],
                                    name: e.target.value,
                                  };
                                  next[catIndex] = {
                                    ...next[catIndex],
                                    items,
                                  };
                                  setDraft((d) => ({
                                    ...d,
                                    itemCategories: next,
                                  }));
                                }}
                                placeholder="Nom de l'item"
                                className={INPUT_CLASS + " min-w-[140px]"}
                              />
                            </td>
                            <td className="py-1.5 pr-2">
                              <input
                                type="text"
                                value={item.destructionValue ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value.trim();
                                  const next = [...draft.itemCategories];
                                  const items = [...next[catIndex].items];
                                  items[index] = {
                                    ...items[index],
                                    destructionValue: v || undefined,
                                  };
                                  next[catIndex] = {
                                    ...next[catIndex],
                                    items,
                                  };
                                  setDraft((d) => ({
                                    ...d,
                                    itemCategories: next,
                                  }));
                                }}
                                placeholder="Si illégal"
                                className={INPUT_CLASS + " min-w-[80px]"}
                              />
                            </td>
                            <td className="py-1.5 pl-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...draft.itemCategories];
                                  next[catIndex] = {
                                    ...next[catIndex],
                                    items: next[catIndex].items.filter(
                                      (_, i) => i !== index
                                    ),
                                  };
                                  setDraft((d) => ({
                                    ...d,
                                    itemCategories: next,
                                  }));
                                }}
                                className="sheriff-focus-ring sheriff-btn-destructive-icon rounded p-1.5"
                                title="Supprimer la ligne"
                                aria-label="Supprimer la ligne"
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...draft.itemCategories];
                      next[catIndex] = {
                        ...next[catIndex],
                        items: [...next[catIndex].items, { name: "" }],
                      };
                      setDraft((d) => ({
                        ...d,
                        itemCategories: next,
                      }));
                    }}
                    className="sheriff-focus-ring rounded border border-dashed border-sheriff-gold/40 bg-sheriff-charcoal/30 px-3 py-2 text-sm text-sheriff-gold/90 transition hover:border-sheriff-gold/60 hover:bg-sheriff-gold/10"
                  >
                    + Ajouter une ligne
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
              : "cat-" + Date.now();
          setDraft((d) => ({
            ...d,
            itemCategories: [
              ...d.itemCategories,
              { id, name: "Nouvelle catégorie", items: [] },
            ],
          }));
          setOpenCategoryIds((prev) => new Set(prev).add(id));
        }}
        className="sheriff-focus-ring w-full rounded border border-dashed border-sheriff-gold/40 bg-sheriff-charcoal/30 px-3 py-3 text-sm text-sheriff-gold/90 transition hover:border-sheriff-gold/60 hover:bg-sheriff-gold/10"
      >
        + Ajouter une catégorie
      </button>
    </div>
  );
}
