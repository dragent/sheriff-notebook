"use client";

import type { HomeInfoCategory } from "@/lib/reference";
import { Chevron, IconHome, TABLE_CARD_CLASS, TABLE_HEAD_CLASS } from "./shared";

type Props = {
  homeInfoCategories: HomeInfoCategory[];
  openHomeCategoryIds: Set<string>;
  setOpenHomeCategoryIds: React.Dispatch<React.SetStateAction<Set<string>>>;
};

export function ReferenceAccueilTab({
  homeInfoCategories,
  openHomeCategoryIds,
  setOpenHomeCategoryIds,
}: Props) {
  if (homeInfoCategories.length === 0) {
    return (
      <section className={TABLE_CARD_CLASS}>
        <h2 className={TABLE_HEAD_CLASS}>Informations d&apos;accueil</h2>
        <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sheriff-gold/10 text-sheriff-gold">
            <IconHome className="h-6 w-6" />
          </span>
          <p className="text-sm text-sheriff-paper-muted">
            Aucune catégorie d’informations d’accueil.
          </p>
          <p className="text-xs text-sheriff-paper-muted/80">
            Cliquez sur « Modifier les informations » puis onglet Informations
            d’accueil pour en créer.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {homeInfoCategories.map((cat) => {
        const isOpen = openHomeCategoryIds.has(cat.id);
        return (
          <section
            key={cat.id}
            id={`home-cat-${cat.id}`}
            className={TABLE_CARD_CLASS}
          >
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
              className={`flex w-full items-center justify-between gap-2 ${TABLE_HEAD_CLASS} cursor-pointer text-left hover:bg-sheriff-gold/10`}
              aria-expanded={isOpen}
            >
              <span>{cat.name}</span>
              <Chevron open={isOpen} />
            </button>
            {isOpen && (
              <ul className="divide-y divide-sheriff-gold/15">
                {(cat.infos ?? []).length === 0 ? (
                  <li className="px-4 py-3 text-sm text-sheriff-paper-muted">
                    Aucune information dans cette catégorie.
                  </li>
                ) : (
                  (cat.infos ?? []).map((info) => (
                    <li key={info.id} className="px-4 py-3">
                      <p className="font-heading text-xs font-semibold uppercase tracking-wider text-sheriff-gold">
                        {info.title}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-sheriff-paper-muted">
                        {info.content}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
