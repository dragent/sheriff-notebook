'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { Flashbag } from "@/components/feedback/Flashbag";
import {
  SHERIFF_FIELD_DENSE as INPUT_BASE,
  SHERIFF_NATIVE_SELECT_DENSE,
} from "@/lib/formFieldClasses";
const CELL_HEADER =
  'border-b border-sheriff-gold/40 bg-sheriff-charcoal/90 px-2.5 py-2 text-left font-heading text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-sheriff-gold sticky top-0 z-10';

export type DestructionOption = {
  name: string;
  destructionValue?: string;
  categoryName?: string;
  /** Libellé d’affichage (ex. arme avec n° de série : "Revolver (n° 123)"). */
  displayLabel?: string;
};

export type DestructionRow = {
  id: string;
  qte: number | '';
  sommes: string;
  destruction: string;
};

type DestructionSaisieFormProps = {
  /** Options pour le select Destruction (items du référentiel avec valeur destruction). */
  destructionOptions: DestructionOption[];
  /** Valeur par défaut pour la date (aujourd’hui au format YYYY-MM-DD). */
  defaultDate?: string;
  /** Appelé après enregistrement réussi (pour rafraîchir l'historique). */
  onSaved?: () => void;
  /** Quantité max disponible par type (nom item/arme) = saisie - déjà détruite. Limite la Qte à ce max. */
  availableQuantities?: Record<string, number>;
};

export type DestructionLinePayload = {
  date: string;
  qte: number;
  sommes: string;
  destruction: string;
};

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyRow(_defaultDate: string): DestructionRow {
  return {
    id: createId(),
    qte: '',
    sommes: '',
    destruction: '',
  };
}

function toNum(q: number | ''): number {
  if (typeof q === 'number' && Number.isFinite(q)) return q;
  if (q === '') return 0;
  const n = parseInt(String(q), 10);
  return Number.isFinite(n) ? n : 0;
}

export function DestructionSaisieForm({
  destructionOptions,
  defaultDate,
  onSaved,
  availableQuantities = {},
}: DestructionSaisieFormProps) {
  const today = defaultDate ?? new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(today);
  const [rows, setRows] = useState<DestructionRow[]>(() => [
    createEmptyRow(today),
  ]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow(today)]);
  }, [today]);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const updateRow = useCallback(
    (id: string, field: keyof DestructionRow, value: string | number) => {
      setRows((prev) => {
        let next = prev.map((r) =>
          r.id === id ? { ...r, [field]: value } : r
        );
        const row = next.find((r) => r.id === id);
        if (!row) return next;
        const name = (row.destruction ?? '').trim();
        const available = name ? availableQuantities[name] : null;
        if (available != null) {
          const otherSameType = next
            .filter((r) => r.id !== id && (r.destruction ?? '').trim() === name)
            .reduce((sum, r) => sum + toNum(r.qte), 0);
          const cap = Math.max(0, available - otherSameType);
          const currentQte = toNum(row.qte);
          if (currentQte > cap) {
            next = next.map((r) => (r.id === id ? { ...r, qte: cap } : r));
          }
        }
        return next;
      });
    },
    [availableQuantities]
  );

  const optionsByCategory = useMemo(() => {
    const map = new Map<string, DestructionOption[]>();
    for (const opt of destructionOptions) {
      const key = opt.categoryName ?? '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(opt);
    }
    // Tri alpha par libellé dans chaque catégorie pour un select plus lisible.
    for (const [key, list] of map.entries()) {
      const sorted = [...list].sort((a, b) => {
        const labelA = a.displayLabel ?? a.name;
        const labelB = b.displayLabel ?? b.name;
        return labelA.localeCompare(labelB, 'fr', { sensitivity: 'base' });
      });
      map.set(key, sorted);
    }
    return map;
  }, [destructionOptions]);

  const categoryEntries = useMemo(
    () => Array.from(optionsByCategory.entries()),
    [optionsByCategory]
  );

  function formatCategoryLabel(key: string): string {
    if (!key) return 'Items du référentiel';
    return key;
  }

  /** Pour chaque ligne, quantité max = disponible pour ce type - quantités déjà saisies sur les autres lignes du même type. */
  const maxQtePerRow = useMemo(() => {
    const max: Record<string, number> = {};
    for (const row of rows) {
      const name = (row.destruction ?? '').trim();
      if (!name) continue;
      const available = availableQuantities[name];
      if (available == null) continue;
      const otherSameType = rows
        .filter((r) => r.id !== row.id && (r.destruction ?? '').trim() === name)
        .reduce((sum, r) => sum + toNum(r.qte), 0);
      max[row.id] = Math.max(0, available - otherSameType);
    }
    return max;
  }, [rows, availableQuantities]);

  /** True si au moins une ligne a une quantité supérieure au maximum autorisé (saisie - déjà détruit). */
  const hasOverflow = useMemo(() => {
    for (const row of rows) {
      const maxQte = maxQtePerRow[row.id];
      if (maxQte == null) continue;
      const qte = toNum(row.qte);
      if (qte > maxQte) return true;
    }
    return false;
  }, [rows, maxQtePerRow]);

  /** True si au moins une ligne n'a pas de type de destruction choisi. */
  const hasMissingDestruction = useMemo(
    () => rows.some((r) => (r.destruction ?? '').trim() === ''),
    [rows]
  );

  const canSave = !hasOverflow && !hasMissingDestruction;

  const handleSave = useCallback(async () => {
    if (!date) {
      setSaveError('La date de destruction est requise.');
      return;
    }
    if (hasMissingDestruction) {
      setSaveError('Choisissez un type de destruction pour chaque ligne.');
      return;
    }
    if (hasOverflow) {
      setSaveError('Une ou plusieurs quantités dépassent le maximum disponible (saisi - déjà détruit). Corrigez les lignes concernées.');
      return;
    }
    const lines: DestructionLinePayload[] = rows.map((r) => ({
      date,
      qte: typeof r.qte === 'number' ? r.qte : (r.qte === '' ? 0 : parseInt(String(r.qte), 10) || 0),
      sommes: r.sommes,
      destruction: r.destruction,
    }));
    setSaveError(null);
    setSaveSuccess(false);
    setSaving(true);
    try {
      const res = await fetch('/api/destructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSaveError(data?.error ?? `Erreur ${res.status}`);
        return;
      }
      setSaveSuccess(true);
      setRows([createEmptyRow(today)]);
      onSaved?.();
      setTimeout(() => setSaveSuccess(false), 3200);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  }, [rows, onSaved, hasOverflow, hasMissingDestruction, today, date]);

  return (
    <div className="sheriff-card overflow-hidden rounded-lg border border-sheriff-gold/30 bg-sheriff-wood shadow-lg">
      <div className="flex flex-col gap-5 p-4 sm:p-6">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-sheriff-gold">
          Lignes de destruction
        </h2>

        <p className="text-xs text-sheriff-paper-muted -mt-2">
          Dans la colonne <strong>Destruction</strong>, choisissez un type pour chaque ligne : <strong>items du référentiel</strong> ou <strong>armes saisies</strong> (enregistrées sur la page{' '}
          <Link href="/saisies" className="sheriff-focus-ring text-sheriff-gold underline decoration-sheriff-gold/50 underline-offset-2 hover:decoration-sheriff-gold rounded">
            Saisies
          </Link>
          ). La quantité ne peut pas dépasser le stock disponible (saisi − déjà détruit).
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs sm:text-sm font-medium text-sheriff-paper flex items-center gap-3">
              <span className="whitespace-nowrap">Date de destruction</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${INPUT_BASE} max-w-[220px]`}
                aria-label="Date de destruction"
                min={today}
              />
            </label>
          </div>

          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            <table className="w-full border-collapse" role="grid" aria-label="Saisie des destructions">
            <thead>
              <tr>
                <th scope="col" className={`${CELL_HEADER} w-[1%] whitespace-nowrap`}>
                  <span className="sr-only">Actions</span>
                </th>
                <th scope="col" className={`${CELL_HEADER} w-[80px] sm:w-[90px]`}>
                  Qte
                </th>
                <th scope="col" className={`${CELL_HEADER} min-w-[160px]`}>
                  Destruction
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-sheriff-gold/15 transition-colors hover:bg-sheriff-charcoal/30"
                >
                  <td className="border-b border-sheriff-gold/15 px-1 py-1.5 align-middle">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length <= 1}
                      className="sheriff-focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded text-sheriff-paper-muted transition hover:bg-sheriff-sortie/20 hover:text-sheriff-sortie disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-sheriff-paper-muted"
                      aria-label="Supprimer la ligne"
                      title="Supprimer la ligne"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </td>
                  <td className="border-b border-sheriff-gold/15 px-2.5 py-1.5 align-middle">
                    {(() => {
                      const maxQte = maxQtePerRow[row.id];
                      const hasLimit = maxQte != null;
                      return (
                        <input
                          type="number"
                          min={0}
                          max={hasLimit ? maxQte : undefined}
                          step={1}
                          value={row.qte === '' ? '' : row.qte}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateRow(row.id, 'qte', v === '' ? '' : parseInt(v, 10) || 0);
                          }}
                          placeholder={hasLimit ? `max ${maxQte}` : '0'}
                          className={INPUT_BASE}
                          aria-label="Quantité"
                          title={hasLimit ? `Maximum : ${maxQte} (quantité saisie restante)` : undefined}
                        />
                      );
                    })()}
                  </td>
                  <td className="border-b border-sheriff-gold/15 px-2.5 py-1.5 align-middle">
                    <select
                      value={row.destruction}
                      onChange={(e) => updateRow(row.id, 'destruction', e.target.value)}
                      className={SHERIFF_NATIVE_SELECT_DENSE}
                      aria-label="Type de destruction"
                    >
                      <option value="">— Choisir —</option>
                      {categoryEntries.map(([catName, opts]) => (
                        <optgroup key={catName || 'default'} label={formatCategoryLabel(catName)}>
                          {opts
                            .filter((opt) => (opt.name ?? '').trim() !== '')
                            .map((opt) => (
                              <option
                                key={`${catName}-${opt.name}-${opt.destructionValue ?? ''}`}
                                value={opt.name}
                              >
                                {opt.displayLabel ?? opt.name}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={addRow}
            className="sheriff-focus-ring sheriff-btn-save-soft inline-flex items-center gap-2 rounded-lg border-dashed px-4 py-2.5 text-sm font-semibold"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Ajouter une ligne
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            title={
              hasMissingDestruction
                ? 'Choisissez un type de destruction pour chaque ligne.'
                : hasOverflow
                  ? 'Réduisez les quantités au maximum disponible pour pouvoir enregistrer.'
                  : undefined
            }
            className="sheriff-focus-ring sheriff-btn-save inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-sheriff-ink border-t-transparent" aria-hidden />
                Enregistrement…
              </>
            ) : (
              'Enregistrer'
            )}
          </button>
          {!canSave && !saving && (
            <span className="text-xs text-sheriff-paper-muted">
              {hasMissingDestruction && 'Sélectionnez un type pour chaque ligne.'}
              {hasOverflow && !hasMissingDestruction && 'Réduisez les quantités au maximum indiqué.'}
            </span>
          )}
        </div>

        {saveSuccess && (
          <Flashbag variant="success">
            Saisie enregistrée. Vous pouvez enchaîner une nouvelle destruction.
          </Flashbag>
        )}
        {saveError && (
          <Flashbag variant="error">{saveError}</Flashbag>
        )}
      </div>
    </div>
  );
}
