"use client";

import type { ComponentType } from "react";

export type TabItem = {
  id: string;
  label: string;
  /** Icône optionnelle (composant avec className). */
  icon?: ComponentType<{ className?: string }>;
  /** Badge optionnel (affiché si > 0). */
  count?: number | null;
};

type TabsProps = {
  /** Onglets à afficher. */
  tabs: TabItem[];
  /** Id de l'onglet actif. */
  value: string;
  /** Callback au changement d'onglet. */
  onChange: (id: string) => void;
  /** Label ARIA de la liste d'onglets. */
  "aria-label": string;
  /**
   * Préfixe pour id et aria-controls (ex. "view" → view-tab-xxx, view-panel-xxx).
   * Si non fourni, pas d'id/aria-controls sur les boutons.
   */
  idPrefix?: string;
  /** Classe optionnelle sur le conteneur. */
  className?: string;
};

const TAB_BASE =
  "sheriff-focus-ring flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition sm:gap-2 sm:px-3 sm:text-sm";
const TAB_ACTIVE = "bg-sheriff-tab-active-bg text-sheriff-tab-active-text shadow-sm";
const TAB_INACTIVE =
  "text-sheriff-paper-muted hover:bg-sheriff-gold/10 hover:text-sheriff-gold";
const LIST_CLASS =
  "inline-flex max-w-full flex-wrap gap-1.5 overflow-x-auto rounded-lg border border-sheriff-gold/30 bg-sheriff-tab-track p-1 sm:gap-2 sm:p-1.5 text-sm sheriff-panel-shadow self-start";

/**
 * Barre d'onglets harmonisée (accueil, référentiel).
 * Conteneur pill + boutons actif/inactif, optionnellement icône et badge.
 */
export function Tabs({
  tabs,
  value,
  onChange,
  "aria-label": ariaLabel,
  idPrefix,
  className = "",
}: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`sheriff-scrollbar-hide ${LIST_CLASS} ${className}`.trim()}
    >
      {tabs.map((tab) => {
        const isActive = value === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            {...(idPrefix && {
              id: `${idPrefix}-tab-${tab.id}`,
              "aria-controls": `${idPrefix}-panel-${tab.id}`,
            })}
            onClick={() => onChange(tab.id)}
            className={`${TAB_BASE} ${isActive ? TAB_ACTIVE : TAB_INACTIVE}`}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <span>{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span className="rounded-full bg-sheriff-tab-active-text/25 px-1.5 py-0.5 text-xs tabular-nums">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
