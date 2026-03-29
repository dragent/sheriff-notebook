"use client";

import { Children, ReactNode } from "react";
import { EmptyTableState } from "@/components/ui/EmptyTableState";

export type SectionTableColumn = {
  key: string;
  label: string;
  /** Alignement de la colonne (défaut: left pour première, center pour les autres si besoin). */
  align?: "left" | "center" | "right";
  /** Classe CSS optionnelle pour le th. */
  headerClassName?: string;
};

type SectionTableProps = {
  /** Id du bloc (pour aria-labelledby, ancres). */
  id?: string;
  /** Titre de la section (affiché en uppercase). */
  title: string;
  /** Description optionnelle sous le titre. */
  description?: string;
  /** Colonnes du tableau (ordre des en-têtes). */
  columns: SectionTableColumn[];
  /** Contenu du tbody (lignes <tr>). Si vide ou non fourni, affiche l'état vide. */
  children?: ReactNode;
  /** Message affiché quand le tableau est vide. */
  emptyMessage?: string;
  /** Sous-titre optionnel sous le message vide. */
  emptySubtitle?: string;
  /** Si true, affiche l'état vide même quand des children sont fournis (ex. chargement). */
  forceEmpty?: boolean;
  /** Contenu optionnel sous le tableau (ex. aide mobile). */
  footer?: ReactNode;
  /** Contenu optionnel entre le titre/description et le tableau (ex. boutons, filtres). */
  actions?: ReactNode;
  /** Rôle ARIA du conteneur (défaut: region). */
  role?: string;
  /** aria-label du conteneur. */
  "aria-label"?: string;
};

const TH_BASE =
  "whitespace-nowrap px-2 py-2 font-heading text-xs uppercase tracking-wide text-sheriff-gold/90";
const TH_LEFT = "text-left";
const TH_CENTER = "text-center";
const TH_RIGHT = "text-right";

/**
 * Bloc réutilisable : titre + description + tableau avec en-têtes.
 * Utilisé sur accueil (Formations), coffres (recensement), référentiel et profil.
 * Quand il n'y a pas de lignes (children vides ou forceEmpty), affiche EmptyTableState.
 */
export function SectionTable({
  id,
  title,
  description,
  columns,
  children,
  emptyMessage = "Aucune donnée.",
  emptySubtitle,
  forceEmpty = false,
  footer,
  actions,
  role = "region",
  "aria-label": ariaLabel,
}: SectionTableProps) {
  const hasNoRows = children == null || Children.count(children) === 0;
  const isEmpty = forceEmpty || hasNoRows;

  return (
    <div
      id={id}
      className="sheriff-card w-full rounded-lg border-sheriff-gold/40 bg-sheriff-wood shadow-md"
      role={role}
      aria-label={ariaLabel ?? title}
    >
      <div className="border-b border-sheriff-gold/40 bg-sheriff-charcoal/80 px-4 py-4">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-sheriff-gold">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-xs text-sheriff-paper-muted/90">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="border-b border-sheriff-gold/20 px-4 py-2">{actions}</div>}
      <div className="sheriff-table-scroll overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-sheriff-gold/30 bg-sheriff-charcoal/95 text-xs uppercase tracking-wide text-sheriff-gold/90 shadow-[0_1px_0_0_var(--sheriff-gold)]">
              {columns.map((col) => {
                const align = col.align ?? "left";
                const alignClass =
                  align === "center"
                    ? TH_CENTER
                    : align === "right"
                      ? TH_RIGHT
                      : TH_LEFT;
                return (
                  <th
                    key={col.key}
                    className={`${TH_BASE} ${alignClass} ${col.headerClassName ?? ""}`}
                    scope="col"
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-sheriff-gold/20">
            {isEmpty ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <EmptyTableState
                    message={emptyMessage}
                    subtitle={emptySubtitle}
                  />
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
      {footer && (
        <div className="mt-2 px-2 pb-3 text-xs text-sheriff-paper-muted">
          {footer}
        </div>
      )}
    </div>
  );
}
