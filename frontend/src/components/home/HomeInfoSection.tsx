import type { HomeInfoCategory } from "@/lib/reference";
import { SectionOrnament } from "@/components/ui/SectionOrnament";

const PANEL_CLASS =
  "sheriff-card--paper flex flex-col overflow-hidden rounded-lg border border-sheriff-gold/40 shadow-md";
const PANEL_HEAD_CLASS =
  "border-b border-sheriff-gold/40 bg-sheriff-charcoal/90 px-4 py-3 font-heading text-xs font-semibold uppercase tracking-wider text-sheriff-gold";

type Props = {
  categories: HomeInfoCategory[];
  action?: React.ReactNode;
};

/**
 * Affiche les informations d'accueil (catégories + blocs titre/contenu).
 */
export function HomeInfoSection({ categories, action }: Props) {
  if (!categories?.length) return null;

  return (
    <section
      className="space-y-6"
      aria-label="Informations du bureau"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-xl font-semibold uppercase tracking-wider text-sheriff-gold sm:text-2xl">
          Informations
        </h2>
        {action && (
          <div className="shrink-0">{action}</div>
        )}
      </div>

      <SectionOrnament tone="brass" className="-mt-2" />

      <div className="grid gap-5 min-[500px]:grid-cols-2">
        {categories.map((cat) => (
          <article
            key={cat.id}
            className={PANEL_CLASS}
            aria-labelledby={`home-cat-title-${cat.id}`}
          >
            <h3
              id={`home-cat-title-${cat.id}`}
              className={PANEL_HEAD_CLASS}
            >
              {cat.name}
            </h3>
            <ul className="flex flex-1 flex-col divide-y divide-sheriff-gold/15">
              {(cat.infos ?? []).length === 0 ? (
                <li className="px-4 py-4 text-sm text-sheriff-paper-muted">
                  Aucune information.
                </li>
              ) : (
                (cat.infos ?? []).map((info) => (
                  <li key={info.id} className="px-4 py-3.5">
                    <p className="font-heading text-xs font-semibold uppercase tracking-wider text-sheriff-gold/95">
                      {info.title}
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-sheriff-paper-muted">
                      {info.content}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
