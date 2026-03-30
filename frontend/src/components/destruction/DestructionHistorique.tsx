'use client';

import { useState } from 'react';
import { Flashbag } from "@/components/feedback/Flashbag";
import {
  DESTRUCTION_LINE_KEY_CASH,
  labelCashDestructionLine,
} from "@/lib/destructionCashKey";

export type DestructionRecordItem = {
  id: string;
  lines: Array<{ date: string; qte: number; sommes: string; destruction: string }>;
  status: 'pending' | 'reussie' | 'perdue';
  createdAt: string;
  validatedAt: string | null;
  createdBy: string | null;
};

type DestructionHistoriqueProps = {
  records: DestructionRecordItem[];
  onValidate: (id: string, status: 'reussie' | 'perdue') => Promise<void>;
  /** Affiche un skeleton de chargement au lieu de la liste. */
  loading?: boolean;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function totalQte(lines: DestructionRecordItem['lines']): number {
  return lines.reduce((acc, l) => acc + (Number(l.qte) || 0), 0);
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'reussie':
      return 'Réussie';
    case 'perdue':
      return 'Perdue';
    default:
      return status;
  }
}

function formatLineDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Affiche "Modèle (n° série)" pour les destructions de type arme avec n° de série. */
function formatDestructionLabel(destruction: string): string {
  if (!destruction) return '—';
  if (destruction === DESTRUCTION_LINE_KEY_CASH) {
    return labelCashDestructionLine();
  }
  const pipe = destruction.indexOf('|');
  if (pipe >= 0) {
    return `${destruction.slice(0, pipe)} (n° ${destruction.slice(pipe + 1)})`;
  }
  return destruction;
}

function HistoriqueSkeleton() {
  return (
    <div className="sheriff-card overflow-hidden rounded-lg border border-sheriff-gold/30 bg-sheriff-wood">
      <div className="border-b border-sheriff-gold/30 bg-sheriff-charcoal/80 px-4 py-3">
        <div className="h-4 w-32 animate-pulse rounded bg-sheriff-gold/20" />
      </div>
      <ul className="divide-y divide-sheriff-gold/15">
        {[1, 2, 3].map((i) => (
          <li key={i} className="px-4 py-4">
            <div className="flex gap-3">
              <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-sheriff-gold/20" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-sheriff-gold/20" />
                <div className="h-3 w-56 animate-pulse rounded bg-sheriff-gold/15" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DestructionHistorique({ records, onValidate, loading = false }: DestructionHistoriqueProps) {
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Ids des enregistrements dont le détail des lignes est ouvert (cliquable pour voir). */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleValidate = async (id: string, status: 'reussie' | 'perdue') => {
    setError(null);
    setValidatingId(id);
    try {
      await onValidate(id, status);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la validation.');
    } finally {
      setValidatingId(null);
    }
  };

  if (loading) {
    return <HistoriqueSkeleton />;
  }

  if (records.length === 0) {
    return (
      <div className="sheriff-card rounded-lg border border-sheriff-gold/30 bg-sheriff-wood p-6">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-sheriff-gold mb-2">
          Historique des destructions
        </h2>
        <p className="text-sm text-sheriff-paper-muted">
          Aucun enregistrement. Enregistrez une saisie ci-dessus pour qu’elle apparaisse ici.
        </p>
      </div>
    );
  }

  return (
    <div className="sheriff-card overflow-hidden rounded-lg border border-sheriff-gold/30 bg-sheriff-wood shadow-lg">
      <div className="border-b border-sheriff-gold/30 bg-sheriff-charcoal/80 px-4 py-3">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-sheriff-gold">
          Historique des destructions
        </h2>
      </div>
      <ul className="divide-y divide-sheriff-gold/15">
        {records.map((record) => {
          const isExpanded = expandedIds.has(record.id);
          const hasLines = record.lines.length > 0;
          return (
            <li
              key={record.id}
              className={`border-l-4 pl-4 py-3 pr-4 ${
                record.status === 'pending'
                  ? 'border-l-sheriff-warning-icon'
                  : record.status === 'reussie'
                    ? 'border-l-sheriff-entree'
                    : 'border-l-sheriff-destructive-text'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => hasLines && toggleExpanded(record.id)}
                onKeyDown={(e) => {
                  if (hasLines && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    toggleExpanded(record.id);
                  }
                }}
                className={`flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${hasLines ? 'cursor-pointer hover:bg-sheriff-charcoal/30 rounded-lg -mx-2 px-2 py-1 transition-colors' : ''}`}
                aria-expanded={hasLines ? isExpanded : undefined}
                aria-label={hasLines ? (isExpanded ? 'Masquer le détail des lignes' : 'Voir le détail des lignes') : undefined}
              >
                <div className="min-w-0 flex-1 flex items-start gap-2">
                  {hasLines && (
                    <span
                      className={`shrink-0 mt-0.5 text-sheriff-gold transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      aria-hidden
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.06l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-sheriff-paper">
                        {formatDate(record.createdAt)}
                      </span>
                      {record.createdBy && (
                        <span className="text-sheriff-paper-muted">— {record.createdBy}</span>
                      )}
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                          record.status === 'pending'
                            ? 'sheriff-badge-warning'
                            : record.status === 'reussie'
                              ? 'sheriff-badge-success'
                              : 'sheriff-badge-destructive'
                        }`}
                      >
                        {statusLabel(record.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-sheriff-paper-muted">
                      {record.lines.length} ligne(s) · Total quantités : {totalQte(record.lines)}
                      {hasLines && (
                        <span className="ml-1 text-sheriff-gold/80">
                          {isExpanded ? ' — cliquer pour masquer' : ' — cliquer pour voir'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {record.status === 'pending' && (
                  <div className="flex shrink-0 gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={validatingId === record.id}
                      onClick={() => handleValidate(record.id, 'reussie')}
                      title="Marquer comme réussie"
                      className="sheriff-focus-ring sheriff-btn-success inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
                    >
                      {validatingId === record.id ? (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sheriff-entree border-t-transparent" aria-hidden />
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Réussie
                    </button>
                    <button
                      type="button"
                      disabled={validatingId === record.id}
                      onClick={() => handleValidate(record.id, 'perdue')}
                      title="Marquer comme perdue"
                      className="sheriff-focus-ring sheriff-btn-destructive inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
                    >
                      {validatingId === record.id ? (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sheriff-destructive-text border-t-transparent" aria-hidden />
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      Perdue
                    </button>
                  </div>
                )}
              </div>
              {/* Détail des lignes (items) — affiché au clic */}
              {record.lines.length > 0 && isExpanded && (
                <div className="mt-3 overflow-x-auto rounded border border-sheriff-gold/20 bg-sheriff-charcoal/50">
                  <table className="w-full min-w-[320px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-sheriff-gold/20">
                        <th className="px-2 py-1.5 text-left font-medium text-sheriff-gold/90">Date</th>
                        <th className="px-2 py-1.5 text-right font-medium text-sheriff-gold/90">Qte</th>
                        <th className="px-2 py-1.5 text-left font-medium text-sheriff-gold/90">Destruction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.lines.map((line, idx) => (
                        <tr key={idx} className="border-b border-sheriff-gold/10 last:border-0">
                          <td className="px-2 py-1.5 text-sheriff-paper-muted">{formatLineDate(line.date)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-sheriff-paper">{line.qte}</td>
                          <td className="px-2 py-1.5 text-sheriff-paper">{formatDestructionLabel(line.destruction ?? '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <div className="border-t border-sheriff-gold/15 pt-3">
          <Flashbag variant="error">{error}</Flashbag>
        </div>
      )}
    </div>
  );
}
