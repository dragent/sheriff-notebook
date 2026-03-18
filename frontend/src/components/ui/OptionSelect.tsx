"use client";

import { useState, useRef, useEffect } from "react";

const INPUT_BASE =
  "w-full rounded-md border border-sheriff-gold/40 bg-sheriff-charcoal/60 px-3 py-2 text-sheriff-paper sheriff-focus-ring";
const LIST_BG = "bg-sheriff-charcoal border border-sheriff-gold/30 shadow-lg";
const OPTION_BASE = "px-3 py-2 text-sm text-sheriff-paper cursor-pointer transition-colors";
const OPTION_HOVER = "bg-sheriff-gold/20 text-sheriff-gold";
const OPTION_SELECTED = "bg-sheriff-gold/25 text-sheriff-gold";

export type OptionSelectItem = { value: string; label: string };

type OptionSelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: OptionSelectItem[];
  /** Texte affiché quand aucune valeur (ex. "Non assignée", "Choisir un sheriff"). */
  placeholder?: string;
  "aria-label": string;
  className?: string;
};

/**
 * Sélecteur pour liste simple (value/label), même style que WeaponSelect.
 * Utilisé pour listes plates : shérifs, types, etc.
 */
export function OptionSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "— Aucune —",
  "aria-label": ariaLabel,
  className = "",
}: OptionSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayValue = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : placeholder;
  const selectedIndex = value ? options.findIndex((o) => o.value === value) : -1;

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
      setHighlightIndex((i) => (i < options.length - 1 ? i + 1 : i));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i > -1 ? i - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex === -1) {
        onChange("");
      } else if (options[highlightIndex]) {
        onChange(options[highlightIndex].value);
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
        aria-activedescendant={
          open
            ? highlightIndex === -1
              ? `${id}-opt-none`
              : `${id}-opt-${highlightIndex}`
            : undefined
        }
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={`${INPUT_BASE} flex min-w-0 items-center justify-between text-left ${className}`}
      >
        <span className={value ? "text-sheriff-paper truncate" : "text-sheriff-paper-muted/70"}>
          {displayValue}
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-sheriff-gold/70 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
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
            {placeholder}
          </li>
          {options.map((opt, idx) => {
            const isHighlight = highlightIndex === idx;
            const isSelected = value === opt.value;
            return (
              <li
                key={opt.value}
                role="option"
                id={`${id}-opt-${idx}`}
                aria-selected={isSelected}
                className={`${OPTION_BASE} ${isHighlight ? OPTION_HOVER : ""} ${isSelected && !isHighlight ? "bg-sheriff-gold/10 text-sheriff-gold/90" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlightIndex(idx)}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
