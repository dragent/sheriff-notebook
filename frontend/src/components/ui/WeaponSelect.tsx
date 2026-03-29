"use client";

import { useState, useRef, useEffect } from "react";
import type { WeaponCategoryOption } from "@/lib/reference";
import {
  SHERIFF_COMBOBOX_TRIGGER_COMFORTABLE,
  SHERIFF_COMBOBOX_TRIGGER_DENSE,
  SHERIFF_COMBOBOX_LIST,
} from "@/lib/formFieldClasses";

function optionRowClass(highlight: boolean, selected: boolean) {
  return [
    "sheriff-registry-option",
    highlight && "sheriff-registry-option--highlight",
    selected && !highlight && "sheriff-registry-option--selected",
  ]
    .filter(Boolean)
    .join(" ");
}

type WeaponSelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: WeaponCategoryOption[];
  "aria-label": string;
  /** Valeur affichée quand une arme n'est pas dans la liste (ex. ancienne ref). */
  customValue?: string;
  /** Dense = tableaux ; comfortable = charte profil / modales. */
  variant?: "dense" | "comfortable";
  className?: string;
};

/**
 * Sélecteur d’arme : même charte que les champs registre (profil = référence).
 */
export function WeaponSelect({
  id,
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
  customValue,
  variant = "comfortable",
  className = "",
}: WeaponSelectProps) {
  const triggerBase =
    variant === "dense" ? SHERIFF_COMBOBOX_TRIGGER_DENSE : SHERIFF_COMBOBOX_TRIGGER_COMFORTABLE;
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
    <div ref={containerRef} className={open ? "relative z-[1]" : "relative"}>
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
        className={`${triggerBase} ${className}`}
      >
        <span className={value ? "text-sheriff-paper" : "text-sheriff-paper-muted/70"}>
          {displayValue}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-sheriff-gold/80 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 8l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-label={ariaLabel}
          className={SHERIFF_COMBOBOX_LIST}
        >
          <li
            role="option"
            id={`${id}-opt-none`}
            aria-selected={!value}
            className={optionRowClass(
              highlightIndex === -1,
              !value && highlightIndex !== -1
            )}
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
              <div className="sheriff-registry-optgroup-label">{cat.label}</div>
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
                      className={optionRowClass(isHighlight, isSelected)}
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
              <div className="sheriff-registry-optgroup-label">Autre</div>
              <ul className="py-0.5">
                <li
                  role="option"
                  id={`${id}-opt-${flatOptions.length - 1}`}
                  aria-selected={value === customValue}
                  className={optionRowClass(
                    highlightIndex === flatOptions.length - 1,
                    value === customValue && highlightIndex !== flatOptions.length - 1
                  )}
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
