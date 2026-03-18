"use client";

import { useState, useRef, useEffect } from "react";
import type { WeaponCategoryOption } from "@/lib/reference";

const INPUT_BASE =
  "w-full rounded-md border border-sheriff-gold/40 bg-sheriff-charcoal/60 px-3 py-2 text-sheriff-paper sheriff-focus-ring";
const LIST_BG = "bg-sheriff-charcoal border border-sheriff-gold/30 shadow-lg";
const OPTION_BASE = "px-3 py-2 text-sm text-sheriff-paper cursor-pointer transition-colors";
const OPTION_HOVER = "bg-sheriff-gold/20 text-sheriff-gold";
const OPTION_SELECTED = "bg-sheriff-gold/25 text-sheriff-gold";
const CATEGORY_HEADER = "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sheriff-gold/80 bg-sheriff-charcoal/80 sticky top-0";

type WeaponSelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: WeaponCategoryOption[];
  "aria-label": string;
  /** Valeur affichée quand une arme n'est pas dans la liste (ex. ancienne ref). */
  customValue?: string;
  className?: string;
};

/**
 * Sélecteur d'arme personnalisé : couleurs thème (or/charbon), pas de bleu natif.
 * Liste déroulante avec catégories (optgroup) et états hover/sélection en sheriff-gold.
 */
export function WeaponSelect({
  id,
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
  customValue,
  className = "",
}: WeaponSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const flatOptions: { value: string; label: string; category?: string }[] = [];
  options.forEach((cat) => {
    cat.weapons.forEach((name) => {
      flatOptions.push({ value: name, label: name, category: cat.label });
    });
  });
  if (customValue && customValue.trim() && !flatOptions.some((o) => o.value === customValue)) {
    flatOptions.push({ value: customValue, label: customValue, category: "Autre" });
  }

  const displayValue = value || "— Aucune —";
  const selectedIndex = value ? flatOptions.findIndex((o) => o.value === value) : -1;

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() =>
      setHighlightIndex(value ? (selectedIndex >= 0 ? selectedIndex : 0) : -1)
    );
  }, [open, value, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i < flatOptions.length - 1 ? i + 1 : i));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i > -1 ? i - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex === -1) {
        onChange("");
      } else if (flatOptions[highlightIndex]) {
        onChange(flatOptions[highlightIndex].value);
      }
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        role="combobox"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-listbox` : undefined}
        aria-activedescendant={open ? (highlightIndex === -1 ? `${id}-opt-none` : `${id}-opt-${highlightIndex}`) : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={`${INPUT_BASE} flex items-center justify-between text-left ${className}`}
      >
        <span className={value ? "text-sheriff-paper" : "text-sheriff-paper-muted/70"}>
          {displayValue}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-sheriff-gold/70 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden
        >
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md py-1 ${LIST_BG}`}
        >
          <li
            role="option"
            id={`${id}-opt-none`}
            aria-selected={!value}
            className={`${OPTION_BASE} ${highlightIndex === -1 ? OPTION_SELECTED : ""} ${highlightIndex === -1 ? "" : "hover:" + OPTION_HOVER}`}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            onMouseEnter={() => setHighlightIndex(-1)}
          >
            — Aucune —
          </li>
          {options.map((cat) => (
            <li key={cat.label}>
              <div className={CATEGORY_HEADER}>{cat.label}</div>
              <ul className="py-0.5">
                {cat.weapons.map((name, _idx) => {
                  const flatIdx = flatOptions.findIndex((o) => o.value === name && o.category === cat.label);
                  const isHighlight = highlightIndex === flatIdx;
                  const isSelected = value === name;
                  return (
                    <li
                      key={name}
                      role="option"
                      id={flatIdx >= 0 ? `${id}-opt-${flatIdx}` : undefined}
                      aria-selected={isSelected}
                      className={`${OPTION_BASE} ${isHighlight ? OPTION_HOVER : ""} ${isSelected && !isHighlight ? "bg-sheriff-gold/10 text-sheriff-gold/90" : ""}`}
                      onClick={() => {
                        onChange(name);
                        setOpen(false);
                      }}
                      onMouseEnter={() => setHighlightIndex(flatIdx)}
                    >
                      {name}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
          {customValue && customValue.trim() && !options.some((c) => c.weapons.includes(customValue)) && (
            <li>
              <div className={CATEGORY_HEADER}>Autre</div>
              <ul className="py-0.5">
                <li
                  role="option"
                  id={`${id}-opt-${flatOptions.length - 1}`}
                  aria-selected={value === customValue}
                  className={`${OPTION_BASE} ${highlightIndex === flatOptions.length - 1 ? OPTION_HOVER : ""} ${value === customValue ? "bg-sheriff-gold/10 text-sheriff-gold/90" : ""}`}
                  onClick={() => {
                    onChange(customValue);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setHighlightIndex(flatOptions.length - 1)}
                >
                  {customValue}
                </li>
              </ul>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
