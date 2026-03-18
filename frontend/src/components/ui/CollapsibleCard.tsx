"use client";

import { useState, useEffect } from "react";

type CollapsibleCardProps = {
  /** Titre affiché dans la barre d'en-tête (toujours visible) */
  title: string;
  /** Sous-titre optionnel, affiché sous le titre quand la carte est ouverte */
  subtitle?: string;
  /** Contenu affiché lorsque la carte est ouverte */
  children: React.ReactNode;
  /** Ouvert par défaut */
  defaultOpen?: boolean;
  /** Identifiant pour l'accessibilité */
  id?: string;
};

/**
 * Carte avec en-tête cliquable : seul le titre reste visible quand fermé.
 */
export function CollapsibleCard({
  title,
  subtitle,
  children,
  defaultOpen = true,
  id: propsId,
}: CollapsibleCardProps) {
  const id = propsId ?? `card-${title.toLowerCase().replace(/\s+/g, "-")}`;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    const openIfHashMatch = () => {
      if (typeof window === "undefined") return;
      if (window.location.hash.slice(1) === id) setIsOpen(true);
    };
    openIfHashMatch();
    window.addEventListener("hashchange", openIfHashMatch);
    return () => window.removeEventListener("hashchange", openIfHashMatch);
  }, [id]);

  return (
    <div
      className="overflow-hidden rounded-lg border border-sheriff-gold/30 bg-sheriff-charcoal/40 shadow-sm transition-shadow hover:shadow-md"
      data-section={id}
    >
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen((o) => !o)}
        className="scroll-mt-24 flex w-full items-center justify-between border-b border-sheriff-gold/20 bg-sheriff-charcoal/95 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-sheriff-gold/10 focus:outline-none focus:ring-2 focus:ring-sheriff-gold/50 focus:ring-inset"
        aria-expanded={isOpen}
        aria-controls={`${id}-panel`}
      >
        <span className="font-heading text-sm font-semibold uppercase tracking-wide text-sheriff-paper">
          {title}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-sheriff-gold transition-transform duration-200 ease-out ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={id}
        hidden={!isOpen}
        className="bg-sheriff-charcoal/30 transition-[height] duration-200 ease-out"
      >
        {subtitle && (
          <p className="border-b border-sheriff-gold/10 px-4 py-2 text-xs text-sheriff-paper-muted">
            {subtitle}
          </p>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

type PageCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Pas d'accordéon : titre + contenu toujours visibles */
  static?: boolean;
};

/**
 * Carte de page avec titre et contenu toujours visibles (sans accordéon).
 */
export function PageCard({
  title,
  subtitle,
  children,
  static: _isStatic = false,
}: PageCardProps) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-sheriff-gold/30 bg-sheriff-charcoal/40 shadow-sm"
      data-section={title.toLowerCase().replace(/\s+/g, "-")}
    >
      <div className="border-b border-sheriff-gold/20 bg-sheriff-charcoal/95 px-4 py-3.5">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-sheriff-paper">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-sheriff-paper-muted">{subtitle}</p>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
