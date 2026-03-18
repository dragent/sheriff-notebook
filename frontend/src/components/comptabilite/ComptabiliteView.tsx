"use client";

import { Flashbag } from "@/components/feedback/Flashbag";

export type EntreeRow = {
  date: string;
  sheriff: string;
  raison: string;
  somme: number;
};

export type SortieRow = {
  date: string;
  sheriff: string;
  raison: string;
  somme: number;
};

export type ComptabiliteData = {
  soldePremierMois: number;
  soldeTotal: number;
  entrees: EntreeRow[];
  sorties: SortieRow[];
};

/**
 * Formate un montant en $ avec virgule décimale.
 */
function formatSomme(value: number): string {
  const parts = value.toFixed(2).split(".");
  const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `$${int},${parts[1]}`;
}

const TABLE_HEAD_CLASS =
  "sheriff-table-head-shadow sticky top-0 z-10 border-b border-sheriff-gold/40 bg-sheriff-charcoal/95 px-3 py-2.5 text-left font-heading text-xs font-semibold uppercase tracking-wider text-sheriff-gold";
const TABLE_CELL_CLASS = "border-b border-sheriff-gold/15 px-3 py-2.5 text-sm text-sheriff-paper-muted";
const TABLE_ROW_ALT = "bg-sheriff-charcoal/25";
const TABLE_TOTAL_ROW = "border-t-2 border-sheriff-gold/40 bg-sheriff-charcoal/60 font-medium text-sheriff-paper";

/**
 * Icône étoile devant le nom du sheriff.
 */
function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`inline-block h-3.5 w-3.5 shrink-0 text-sheriff-gold ${className ?? ""}`}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
    </svg>
  );
}

type ComptabiliteViewProps = {
  data: ComptabiliteData | null;
};

/**
 * Vue lecture seule : soldes, entrées et sorties (tableaux).
 */
export function ComptabiliteView({ data }: ComptabiliteViewProps) {
  const entrees = data?.entrees ?? [];
  const sorties = data?.sorties ?? [];
  const soldePremierMois = data?.soldePremierMois ?? 0;
  const soldeTotal = data?.soldeTotal ?? 0;
  const totalEntrees = entrees.reduce((a, r) => a + r.somme, 0);
  const totalSorties = sorties.reduce((a, r) => a + r.somme, 0);

  const soldePremierPositive = soldePremierMois >= 0;
  const soldeTotalPositive = soldeTotal >= 0;
  const soldeNegatif = soldeTotal < 0;

  return (
    <div className="flex flex-col gap-6">
      {soldeNegatif && (
        <Flashbag variant="warning">
          Le solde total est négatif. Les sorties dépassent les entrées.
        </Flashbag>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(200px,280px)_1fr_1fr]">
      <div className="flex flex-col gap-4 lg:gap-5">
        <div className="sheriff-card rounded-lg border border-sheriff-gold/30 bg-sheriff-charcoal/60 px-5 py-5 transition-shadow">
          <p className="font-heading text-[11px] font-semibold uppercase tracking-wider text-sheriff-gold/90">
            Solde du bureau
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-sheriff-paper-muted/80">1er mois</p>
          <p
            className={`mt-3 font-heading text-xl tabular-nums text-sheriff-paper sm:text-2xl ${
              !soldePremierPositive ? "text-sheriff-sortie" : ""
            }`}
          >
            {formatSomme(soldePremierMois)}
          </p>
        </div>
        <div className="sheriff-card rounded-lg border border-sheriff-gold/40 bg-sheriff-charcoal/70 px-5 py-5 transition-shadow">
          <p className="font-heading text-[11px] font-semibold uppercase tracking-wider text-sheriff-gold/90">
            Solde du bureau
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-sheriff-paper-muted/80">Total</p>
          <p
            className={`mt-3 font-heading text-xl font-semibold tabular-nums text-sheriff-paper sm:text-2xl ${
              !soldeTotalPositive ? "text-sheriff-sortie" : ""
            }`}
          >
            {formatSomme(soldeTotal)}
          </p>
        </div>
      </div>

      <div className="sheriff-panel-shadow overflow-hidden rounded-lg border border-sheriff-gold/30 bg-sheriff-wood">
        <h2 className="flex items-center gap-2 border-b border-sheriff-entree/30 bg-sheriff-charcoal/90 px-4 py-3 font-heading text-sm font-semibold uppercase tracking-wider text-sheriff-entree">
          <span className="h-1.5 w-1.5 rounded-full bg-sheriff-entree" aria-hidden />
          Entrées
        </h2>
        <div className="sheriff-table-scroll max-h-[420px] overflow-y-auto">
          <table className="w-full min-w-[320px] border-collapse">
            <thead>
              <tr>
                <th className={TABLE_HEAD_CLASS}>Date</th>
                <th className={TABLE_HEAD_CLASS}>Sheriff</th>
                <th className={TABLE_HEAD_CLASS}>Raison</th>
                <th className={`${TABLE_HEAD_CLASS} text-right`}>Somme</th>
              </tr>
            </thead>
            <tbody>
              {entrees.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`${TABLE_CELL_CLASS} border-b-0 py-12 text-center`}>
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sheriff-entree-bg text-sheriff-entree" aria-hidden>
                      <svg className="h-6 w-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 4v12M4 10h12" />
                      </svg>
                    </span>
                    <span className="mt-3 block font-medium text-sheriff-paper">Aucune entrée</span>
                    <span className="mt-1 block text-sm text-sheriff-paper-muted">
                      Cliquez sur « Ajouter une entrée » pour enregistrer une recette.
                    </span>
                  </td>
                </tr>
              ) : (
                <>
                  {entrees.map((row, i) => (
                    <tr
                      key={`e-${i}`}
                      className={`${i % 2 === 1 ? TABLE_ROW_ALT : ""} transition-colors hover:bg-sheriff-charcoal/40`}
                    >
                      <td className={TABLE_CELL_CLASS}>{row.date}</td>
                      <td className={TABLE_CELL_CLASS}>
                        <span className="inline-flex items-center gap-1">
                          <StarIcon />
                          {row.sheriff}
                        </span>
                      </td>
                      <td className={TABLE_CELL_CLASS}>{row.raison}</td>
                      <td className={`${TABLE_CELL_CLASS} text-right tabular-nums`}>
                        {formatSomme(row.somme)}
                      </td>
                    </tr>
                  ))}
                  <tr className={TABLE_TOTAL_ROW}>
                    <td colSpan={3} className="px-3 py-2.5 text-right font-heading text-xs uppercase tracking-wider text-sheriff-gold/90">
                      Total entrées
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-sheriff-entree">
                      {formatSomme(totalEntrees)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sheriff-panel-shadow overflow-hidden rounded-lg border border-sheriff-gold/30 bg-sheriff-wood">
        <h2 className="flex items-center gap-2 border-b border-sheriff-sortie/30 bg-sheriff-charcoal/90 px-4 py-3 font-heading text-sm font-semibold uppercase tracking-wider text-sheriff-sortie">
          <span className="h-1.5 w-1.5 rounded-full bg-sheriff-sortie" aria-hidden />
          Sorties
        </h2>
        <div className="sheriff-table-scroll max-h-[420px] overflow-y-auto">
          <table className="w-full min-w-[320px] border-collapse">
            <thead>
              <tr>
                <th className={TABLE_HEAD_CLASS}>Date</th>
                <th className={TABLE_HEAD_CLASS}>Sheriff</th>
                <th className={TABLE_HEAD_CLASS}>Raison</th>
                <th className={`${TABLE_HEAD_CLASS} text-right`}>Somme</th>
              </tr>
            </thead>
            <tbody>
              {sorties.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`${TABLE_CELL_CLASS} border-b-0 py-12 text-center`}>
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sheriff-sortie-bg text-sheriff-sortie" aria-hidden>
                      <svg className="h-6 w-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 10h12" />
                      </svg>
                    </span>
                    <span className="mt-3 block font-medium text-sheriff-paper">Aucune sortie</span>
                    <span className="mt-1 block text-sm text-sheriff-paper-muted">
                      Cliquez sur « Ajouter une sortie » pour enregistrer une dépense.
                    </span>
                  </td>
                </tr>
              ) : (
                <>
                  {sorties.map((row, i) => (
                    <tr
                      key={`s-${i}`}
                      className={`${i % 2 === 1 ? TABLE_ROW_ALT : ""} transition-colors hover:bg-sheriff-charcoal/40`}
                    >
                      <td className={TABLE_CELL_CLASS}>{row.date}</td>
                      <td className={TABLE_CELL_CLASS}>
                        <span className="inline-flex items-center gap-1">
                          <StarIcon />
                          {row.sheriff}
                        </span>
                      </td>
                      <td className={TABLE_CELL_CLASS}>{row.raison}</td>
                      <td className={`${TABLE_CELL_CLASS} text-right tabular-nums`}>
                        {formatSomme(row.somme)}
                      </td>
                    </tr>
                  ))}
                  <tr className={TABLE_TOTAL_ROW}>
                    <td colSpan={3} className="px-3 py-2.5 text-right font-heading text-xs uppercase tracking-wider text-sheriff-gold/90">
                      Total sorties
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-sheriff-sortie">
                      {formatSomme(totalSorties)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
