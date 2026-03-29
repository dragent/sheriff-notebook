"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
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

export type OptionSelectItem = { value: string; label: string };

type OptionSelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: OptionSelectItem[];
  /** Texte affiché quand aucune valeur (ex. "Non assignée", "Choisir un sheriff"). */
  placeholder?: string;
  "aria-label": string;
  variant?: "dense" | "comfortable";
  className?: string;
};

/**
 * Liste value/label — même charte que WeaponSelect / champs profil.
 */
export function OptionSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "— Aucune —",
  "aria-label": ariaLabel,
  variant = "comfortable",
  className = "",
}: OptionSelectProps) {
  const triggerBase =
    variant === "dense" ? SHERIFF_COMBOBOX_TRIGGER_DENSE : SHERIFF_COMBOBOX_TRIGGER_COMFORTABLE;
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const [listboxPos, setListboxPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const updateListboxPosition = useCallback(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 4;
    const maxListPx = 16 * 16; /* 16rem */
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const openDown = spaceBelow >= 120 || spaceBelow >= spaceAbove;
    if (openDown) {
      setListboxPos({
        top: rect.bottom + gap,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(maxListPx, Math.max(80, spaceBelow)),
      });
    } else {
      setListboxPos({
        bottom: window.innerHeight - rect.top + gap,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(maxListPx, Math.max(80, spaceAbove)),
      });
    }
  }, [open]);

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

  useLayoutEffect(() => {
    if (!open) return;
    updateListboxPosition();
  }, [open, updateListboxPosition, options.length]);

  useEffect(() => {
    if (!open) return;
    const handleScrollOrResize = () => updateListboxPosition();
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [open, updateListboxPosition]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (listboxRef.current?.contains(t)) return;
      setOpen(false);
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

  const listboxEl =
    open &&
    listboxPos &&
    typeof document !== "undefined" &&
    createPortal(
      <ul
        ref={listboxRef}
        id={`${id}-listbox`}
        role="listbox"
        aria-label={ariaLabel}
        className={`${SHERIFF_COMBOBOX_LIST} mt-0!`}
        style={
          {
            /* Inline layer: global .sheriff-registry-listbox sets z-index:1; must beat modals (z-50) and sticky headers */
            position: "fixed",
            zIndex: 100000,
            top: listboxPos.top,
            bottom: listboxPos.bottom,
            left: listboxPos.left,
            width: listboxPos.width,
            maxHeight: listboxPos.maxHeight,
          } as CSSProperties
        }
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
              className={optionRowClass(isHighlight, isSelected)}
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
      </ul>,
      document.body
    );

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        ref={triggerRef}
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
        className={`${triggerBase} ${className}`}
      >
        <span className={value ? "text-sheriff-paper truncate" : "text-sheriff-paper-muted/70"}>
          {displayValue}
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-sheriff-gold/80 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
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

      {listboxEl}
    </div>
  );
}
