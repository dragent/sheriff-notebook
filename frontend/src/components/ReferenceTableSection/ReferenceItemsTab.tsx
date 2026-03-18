"use client";

import type { ItemCategory } from "@/lib/reference";
import { Chevron, IconItems, ItemsTable, TABLE_CARD_CLASS, TABLE_HEAD_CLASS } from "./shared";

type Props = {
  itemCategories: ItemCategory[];
  openCategoryIds: Set<string>;
  setOpenCategoryIds: React.Dispatch<React.SetStateAction<Set<string>>>;
};

export function ReferenceItemsTab({
  itemCategories,
  openCategoryIds,
  setOpenCategoryIds,
}: Props) {
  if (itemCategories.length === 0) {
    return (
      <section className={TABLE_CARD_CLASS}>
        <h2 className={TABLE_HEAD_CLASS}>Items</h2>
        <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sheriff-gold/10 text-sheriff-gold">
            <IconItems className="h-6 w-6" />
          </span>
          <p className="text-sm text-sheriff-paper-muted">
            Aucune catégorie d’items.
          </p>
          <p className="text-xs text-sheriff-paper-muted/80">
            Cliquez sur « Modifier les informations » puis onglet Items pour en
            créer.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {itemCategories.map((cat) => {
        const isOpen = openCategoryIds.has(cat.id);
        return (
          <section
            key={cat.id}
            id={`cat-${cat.id}`}
            className={TABLE_CARD_CLASS}
          >
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
              className={`flex w-full items-center justify-between gap-2 ${TABLE_HEAD_CLASS} cursor-pointer text-left hover:bg-sheriff-gold/10`}
              aria-expanded={isOpen}
            >
              <span>{cat.name}</span>
              <Chevron open={isOpen} />
            </button>
            {isOpen && (
              <div className="border-t border-sheriff-gold/20">
                <ItemsTable
                  id={`items-${cat.id}`}
                  items={cat.items}
                  emptyLabel="Aucun item dans cette catégorie"
                />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
