"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  ComptabiliteView,
  type ComptabiliteData,
  type EntreeRow,
} from "./ComptabiliteView";
import { Flashbag } from "@/components/feedback/Flashbag";
import {
  SHERIFF_FIELD_COMFORTABLE as MODAL_FIELD_BASE,
  SHERIFF_NATIVE_SELECT_COMFORTABLE as MODAL_SELECT_BASE,
} from "@/lib/formFieldClasses";

/**
 * Formate un montant en $ avec virgule décimale.
 */
function formatSomme(value: number): string {
  const parts = Math.abs(value).toFixed(2).split(".");
  const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `$${int},${parts[1]}`;
}

/**
 * Icône entrée (recette).
 */
function EntreeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

/**
 * Icône sortie (dépense).
 */
function SortieIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10h12" />
    </svg>
  );
}

/**
 * Convertit YYYY-MM-DD en DD.MM pour affichage.
 */
function toDDMM(iso: string): string {
  if (typeof iso !== "string") return String(iso ?? "");
  const parts = iso.split("-");
  const [, m, d] = parts;
  if (!d || !m) return iso;
  return `${d.padStart(2, "0")}.${m.padStart(2, "0")}`;
}

/**
 * Retourne true si la date ISO est dans le mois courant.
 */
function isCurrentMonth(iso: string): boolean {
  if (typeof iso !== "string") return false;
  const parts = iso.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const now = new Date();
  return y === now.getFullYear() && m === now.getMonth() + 1;
}

type TransactionForm = {
  date: string;
  sheriff: string;
  raison: string;
  somme: string;
};

const getInitialForm = (): TransactionForm => ({
  date: "",
  sheriff: "",
  raison: "",
  somme: "",
});

type TransactionType = "entree" | "sortie";

type RowWithIso = { dateIso: string; sheriff: string; raison: string; somme: number };

/**
 * Mappe une ligne API vers le format d’affichage.
 */
function toDisplayRow(r: RowWithIso): EntreeRow {
  return { date: toDDMM(r.dateIso), sheriff: r.sheriff, raison: r.raison, somme: r.somme };
}

type ComptabiliteApiResponse = {
  entrees?: Array<{ dateIso: string; sheriff: string; raison: string; somme: number }>;
  sorties?: Array<{ dateIso: string; sheriff: string; raison: string; somme: number }>;
  error?: string;
};

export type SheriffOption = { id: string; username: string };

type ComptabiliteSectionProps = {
  sheriffs: SheriffOption[];
};

/**
 * Section Comptabilité : liste des entrées/sorties, formulaire d’écriture et toasts.
 */
export function ComptabiliteSection({ sheriffs = [] }: ComptabiliteSectionProps) {
  const [entreesRaw, setEntreesRaw] = useState<RowWithIso[]>([]);
  const [sortiesRaw, setSortiesRaw] = useState<RowWithIso[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>("entree");
  const [form, setForm] = useState<TransactionForm>(() => ({
    ...getInitialForm(),
    date: new Date().toISOString().slice(0, 10),
  }));
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [toast, setToast] = useState<"entree" | "sortie" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const closeModalAndRestoreFocus = useCallback(() => {
    setModalOpen(false);
    setForm(getInitialForm());
    requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/comptabilite", { cache: "no-store" })
      .then((res) => res.json() as Promise<ComptabiliteApiResponse>)
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setLoadError(data.error);
          return;
        }
        setEntreesRaw(Array.isArray(data.entrees) ? data.entrees : []);
        setSortiesRaw(Array.isArray(data.sorties) ? data.sorties : []);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Impossible de charger la comptabilité.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (toast == null) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!modalOpen) return;
    const initialFormValue = getInitialForm();
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    first?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        setForm(initialFormValue);
        requestAnimationFrame(() => previousFocusRef.current?.focus());
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [modalOpen]);

  const openModal = useCallback((type: TransactionType) => {
    setModalType(type);
    setFormError(null);
    setForm({
      ...getInitialForm(),
      date: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  }, []);

  const sumEntrees = entreesRaw.reduce((a, r) => a + r.somme, 0);
  const sumSorties = sortiesRaw.reduce((a, r) => a + r.somme, 0);
  const soldeTotal = sumEntrees - sumSorties;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      const sheriff = form.sheriff.trim();
      const raison = form.raison.trim();
      const rawSomme = form.somme.replace(/\s/g, "").replace(",", ".");
      const somme = Math.round(parseFloat(rawSomme) * 100) / 100;
      if (!form.date || !sheriff || !raison) {
        setFormError("Remplissez tous les champs.");
        return;
      }
      if (rawSomme === "" || Number.isNaN(somme)) {
        setFormError("Somme invalide. Ex. : 150 ou 12,50");
        return;
      }
      if (somme < 0) {
        setFormError("La somme doit être positive.");
        return;
      }

      // Blocage front : une sortie ne doit pas faire passer le solde en négatif.
      if (modalType === "sortie" && soldeTotal - somme < 0) {
        setFormError("Impossible d'enregistrer cette sortie : le solde passerait en négatif.");
        return;
      }

      const dateIso = typeof form.date === "string" ? form.date : "";
      if (!dateIso) return;

      try {
        const res = await fetch("/api/comptabilite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: modalType,
            dateIso,
            sheriff,
            raison,
            somme,
          }),
        });
        const data = (await res.json()) as { error?: string; somme?: number } & RowWithIso;
        if (!res.ok) {
          setFormError(data.error ?? "Erreur lors de l'enregistrement.");
          return;
        }
        const row: RowWithIso = {
          dateIso: data.dateIso ?? dateIso,
          sheriff: data.sheriff ?? sheriff,
          raison: data.raison ?? raison,
          somme: typeof data.somme === "number" ? data.somme : somme,
        };
        if (modalType === "entree") {
          setEntreesRaw((prev) => [...prev, row]);
          setToast("entree");
        } else {
          setSortiesRaw((prev) => [...prev, row]);
          setToast("sortie");
        }
        closeModalAndRestoreFocus();
      } catch {
        setFormError("Erreur réseau. Réessayez.");
      }
    },
    [form, modalType, soldeTotal, closeModalAndRestoreFocus]
  );

  const soldePremierMois =
    entreesRaw.filter((r) => isCurrentMonth(r.dateIso)).reduce((a, r) => a + r.somme, 0) -
    sortiesRaw.filter((r) => isCurrentMonth(r.dateIso)).reduce((a, r) => a + r.somme, 0);

  const entreesSorted = useMemo(
    () => [...entreesRaw].sort((a, b) => b.dateIso.localeCompare(a.dateIso)),
    [entreesRaw]
  );
  const sortiesSorted = useMemo(
    () => [...sortiesRaw].sort((a, b) => b.dateIso.localeCompare(a.dateIso)),
    [sortiesRaw]
  );

  const data: ComptabiliteData = {
    soldePremierMois,
    soldeTotal,
    entrees: entreesSorted.map(toDisplayRow),
    sorties: sortiesSorted.map(toDisplayRow),
  };

  const hasAnyTransaction = entreesRaw.length > 0 || sortiesRaw.length > 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <p className="rounded-lg border border-sheriff-gold/20 bg-sheriff-charcoal/40 px-4 py-3 text-sm text-sheriff-paper-muted">
          Chargement de la comptabilité…
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-6">
        <Flashbag variant="error">{loadError}</Flashbag>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Bandeau récap — chiffres clés en un coup d'œil */}
      {hasAnyTransaction && (
        <div
          className="sheriff-panel-shadow flex flex-wrap items-center gap-6 rounded-xl border border-sheriff-gold/25 bg-sheriff-charcoal/60 px-5 py-4"
          role="region"
          aria-label="Résumé comptable"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-sheriff-paper-muted">Entrées</span>
            <span className="font-heading text-lg tabular-nums text-sheriff-entree sm:text-xl">{formatSomme(sumEntrees)}</span>
          </div>
          <div className="h-6 w-px bg-sheriff-gold/30" aria-hidden />
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-sheriff-paper-muted">Sorties</span>
            <span className="font-heading text-lg tabular-nums text-sheriff-sortie sm:text-xl">{formatSomme(sumSorties)}</span>
          </div>
          <div className="h-6 w-px bg-sheriff-gold/30" aria-hidden />
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-sheriff-paper-muted">Solde</span>
            <span
              className={`font-heading text-lg tabular-nums sm:text-xl ${soldeTotal >= 0 ? "text-sheriff-paper" : "text-sheriff-sortie"}`}
            >
              {formatSomme(soldeTotal)}
            </span>
          </div>
        </div>
      )}

      {/* Toast confirmation */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="sheriff-panel-shadow fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-sheriff-gold/40 bg-sheriff-wood px-4 py-3 transition-opacity duration-300"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-sheriff-paper">
            {toast === "entree" ? (
              <>
                <EntreeIcon className="h-4 w-4 text-sheriff-entree" />
                Entrée enregistrée
              </>
            ) : (
              <>
                <SortieIcon className="h-4 w-4 text-sheriff-sortie" />
                Sortie enregistrée
              </>
            )}
          </span>
        </div>
      )}

      {!hasAnyTransaction && (
        <p className="rounded-lg border border-sheriff-gold/20 bg-sheriff-charcoal/40 px-4 py-3 text-sm text-sheriff-paper-muted">
          Ajoutez votre première entrée ou sortie pour commencer. Les montants s&apos;afficheront dans les tableaux et le solde sera calculé automatiquement.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => openModal("entree")}
          aria-label="Ajouter une entrée (recette)"
          className="sheriff-focus-ring flex items-center gap-2 rounded-lg border border-sheriff-entree bg-sheriff-entree-bg px-4 py-2.5 text-sm font-medium text-sheriff-entree transition hover:bg-sheriff-entree/25 sm:gap-2.5"
        >
          <EntreeIcon className="h-4 w-4 shrink-0" />
          Ajouter une entrée
        </button>
        <button
          type="button"
          onClick={() => openModal("sortie")}
          aria-label="Ajouter une sortie (dépense)"
          className="sheriff-focus-ring flex items-center gap-2 rounded-lg border border-sheriff-sortie bg-sheriff-sortie-bg px-4 py-2.5 text-sm font-medium text-sheriff-sortie transition hover:bg-sheriff-sortie/25 sm:gap-2.5"
        >
          <SortieIcon className="h-4 w-4 shrink-0" />
          Ajouter une sortie
        </button>
      </div>

      <ComptabiliteView data={data} />

      {/* Modal formulaire transaction */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transaction-modal-title"
        >
          <button
            type="button"
            onClick={closeModalAndRestoreFocus}
            className="absolute inset-0 -z-10 cursor-default focus:outline-none"
            aria-label="Fermer"
            tabIndex={-1}
          />
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className={`sheriff-card w-full max-w-md rounded-lg border bg-sheriff-wood p-6 ${
              modalType === "entree"
                ? "border-sheriff-entree/50"
                : "border-sheriff-sortie/50"
            }`}
          >
            <div className="mb-5 flex items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  modalType === "entree"
                    ? "bg-sheriff-entree-bg text-sheriff-entree"
                    : "bg-sheriff-sortie-bg text-sheriff-sortie"
                }`}
                aria-hidden
              >
                {modalType === "entree" ? (
                  <EntreeIcon className="h-4 w-4" />
                ) : (
                  <SortieIcon className="h-4 w-4" />
                )}
              </span>
              <h2
                id="transaction-modal-title"
                className={`font-heading text-lg font-semibold uppercase tracking-wider ${
                  modalType === "entree"
                    ? "text-sheriff-entree"
                    : "text-sheriff-sortie"
                }`}
              >
                {modalType === "entree" ? "Nouvelle entrée" : "Nouvelle sortie"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="tx-date" className="mb-1 block text-xs font-medium text-sheriff-paper-muted">
                  Date
                </label>
                <input
                  id="tx-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className={MODAL_FIELD_BASE}
                />
              </div>
              <div>
                <label htmlFor="tx-sheriff" className="mb-1 block text-xs font-medium text-sheriff-paper-muted">
                  Sheriff
                </label>
                <select
                  id="tx-sheriff"
                  required
                  value={form.sheriff}
                  onChange={(e) => setForm((f) => ({ ...f, sheriff: e.target.value }))}
                  className={MODAL_SELECT_BASE}
                >
                  <option value="">Choisir un sheriff</option>
                  {sheriffs.map((s) => (
                    <option key={s.id} value={s.username}>
                      {s.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tx-raison" className="mb-1 block text-xs font-medium text-sheriff-paper-muted">
                  Raison
                </label>
                <input
                  id="tx-raison"
                  type="text"
                  required
                  value={form.raison}
                  onChange={(e) => setForm((f) => ({ ...f, raison: e.target.value }))}
                  placeholder={modalType === "entree" ? "Primes, dons, …" : "Achat, prime, …"}
                  className={MODAL_FIELD_BASE}
                />
              </div>
              <div>
                <label htmlFor="tx-somme" className="mb-1 block text-xs font-medium text-sheriff-paper-muted">
                  Somme ($)
                </label>
                <input
                  id="tx-somme"
                  type="text"
                  inputMode="decimal"
                  required
                  value={form.somme}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, somme: e.target.value }));
                    setFormError(null);
                  }}
                  placeholder="0,00"
                  aria-invalid={!!formError}
                  aria-describedby={formError ? "tx-somme-error" : undefined}
                  className={MODAL_FIELD_BASE}
                />
                {formError && (
                  <p id="tx-somme-error" className="mt-1.5 text-xs text-sheriff-sortie" role="alert">
                    {formError}
                  </p>
                )}
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModalAndRestoreFocus}
                  className="sheriff-focus-ring sheriff-btn-secondary rounded-md px-4 py-2 text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="sheriff-focus-ring sheriff-btn-save rounded-md px-4 py-2 text-sm font-semibold"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
