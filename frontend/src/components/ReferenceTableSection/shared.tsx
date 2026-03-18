"use client";

import { useState, useEffect } from "react";
import type { ReferenceItem, WeaponEntry } from "@/lib/reference";

/** Six weapon types used by the reference table (weapons tab). */
export const WEAPON_TYPES = [
  { key: "fusil", label: "Fusil" },
  { key: "carabine", label: "Carabine" },
  { key: "fusilAPompe", label: "Fusil à pompe" },
  { key: "revolver", label: "Revolver" },
  { key: "pistolet", label: "Pistolet" },
  { key: "armeBlanche", label: "Arme blanche" },
] as const;

export type WeaponKeys = (typeof WEAPON_TYPES)[number]["key"];

export function Chevron({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <svg
      className={`inline-block h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""} ${className ?? ""}`}
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
  );
}

export function IconWeapons({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4Zm2 6a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H7Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function IconItems({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path d="M7 3a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H7ZM4 7a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm-2 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4Z" />
    </svg>
  );
}

export function IconHome({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-4v-4a1 1 0 0 0-2 0v4H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function IconFormations({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path d="M10 2a1 1 0 0 1 .8.4l7 9a1 1 0 0 1-.8 1.6H3a1 1 0 0 1-.8-1.6l7-9A1 1 0 0 1 10 2Zm0 3.333L5.5 11h9L10 5.333ZM4 13a1 1 0 0 1 1 1v1h10v-1a1 1 0 1 1 2 0v1.5A1.5 1.5 0 0 1 15.5 17h-11A1.5 1.5 0 0 1 3 15.5V14a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function IconEffectif({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path d="M10 2a1 1 0 0 1 .894.553l2.5 5a1 1 0 0 1-1.788.894L10 5.236 8.394 8.447a1 1 0 1 1-1.788-.894l2.5-5A1 1 0 0 1 10 2ZM5 6a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5Zm10 0a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1ZM5 12a1 1 0 0 0-1 1v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3a1 1 0 0 0-1-1H5Z" />
    </svg>
  );
}

export function IconClock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export const TABLE_CARD_CLASS =
  "overflow-hidden rounded-lg border border-sheriff-gold/30 bg-sheriff-wood shadow-sm";
export const TABLE_HEAD_CLASS =
  "border-b border-sheriff-gold/40 bg-sheriff-charcoal/80 px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-sheriff-gold";
export const TABLE_CELL_CLASS =
  "border-b border-sheriff-gold/15 px-4 py-2.5 text-sm text-sheriff-paper-muted";
export const TABLE_CELL_LAST = "border-b-0";

/** Affiche la date formatée après montage pour éviter une erreur d’hydratation. */
export function FormattedDate({ isoDate }: { isoDate: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);
  if (!mounted) return <span>{isoDate}</span>;
  return <span>{new Date(isoDate).toLocaleString("fr-FR")}</span>;
}

/** Tableau Armes : section repliable par type. */
export function WeaponsTable({
  id,
  weapons,
}: {
  id: string;
  weapons: Record<WeaponKeys, WeaponEntry[]>;
}) {
  const [openTypeKeys, setOpenTypeKeys] = useState<Set<string>>(() =>
    new Set(WEAPON_TYPES.map((t) => t.key))
  );

  const toggleType = (key: string) => {
    setOpenTypeKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasAnyWeapon = WEAPON_TYPES.some(
    (t) => (weapons[t.key] ?? []).length > 0
  );

  return (
    <section id={id} className={TABLE_CARD_CLASS}>
      <div className="sheriff-table-scroll overflow-x-auto">
        {!hasAnyWeapon ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-sheriff-gold/10 text-sheriff-gold"
              aria-hidden
            >
              <IconWeapons className="h-5 w-5" />
            </span>
            <p className="text-sm text-sheriff-paper-muted">
              Aucune arme enregistrée
            </p>
          </div>
        ) : (
          WEAPON_TYPES.map(({ key, label }) => {
            const list = weapons[key] ?? [];
            if (list.length === 0) return null;
            const isOpen = openTypeKeys.has(key);
            return (
              <div
                key={key}
                className="border-b border-sheriff-gold/15 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => toggleType(key)}
                  className="sheriff-focus-ring flex w-full items-center gap-2 border-b border-sheriff-gold/40 bg-sheriff-charcoal/80 px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-sheriff-gold hover:bg-sheriff-gold/10"
                  aria-expanded={isOpen}
                >
                  <Chevron open={isOpen} className="shrink-0" />
                  <span>{label}</span>
                  <span className="ml-1 text-sheriff-paper-muted normal-case">
                    ({list.length})
                  </span>
                </button>
                {isOpen && (
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th scope="col" className={TABLE_HEAD_CLASS}>
                          Nom
                        </th>
                        <th scope="col" className={TABLE_HEAD_CLASS}>
                          Prix destruction ($)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((entry, i) => (
                        <tr
                          key={i}
                          className={
                            "transition hover:bg-sheriff-gold/5 " +
                            (i === list.length - 1 ? "border-b-0" : "")
                          }
                        >
                          <td
                            className={
                              TABLE_CELL_CLASS +
                              (i === list.length - 1
                                ? " " + TABLE_CELL_LAST
                                : "")
                            }
                          >
                            {entry.name}
                          </td>
                          <td
                            className={
                              TABLE_CELL_CLASS +
                              (i === list.length - 1
                                ? " " + TABLE_CELL_LAST
                                : "")
                            }
                          >
                            {entry.destructionValue ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

/** Tableau Items par catégorie. */
export function ItemsTable({
  id: _id,
  items,
  emptyLabel = "Aucun item enregistré",
}: {
  id: string;
  items: ReferenceItem[];
  emptyLabel?: string;
}) {
  return (
    <div className="sheriff-table-scroll overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr>
            <th scope="col" className={TABLE_HEAD_CLASS}>
              Item
            </th>
            <th scope="col" className={TABLE_HEAD_CLASS}>
              Valeur
            </th>
            <th scope="col" className={TABLE_HEAD_CLASS}>
              Valeur destruction ($)
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                className={TABLE_CELL_CLASS + " " + TABLE_CELL_LAST}
                colSpan={3}
              >
                {emptyLabel}
              </td>
            </tr>
          ) : (
            items.map((row, i) => (
              <tr key={i} className="transition hover:bg-sheriff-gold/5">
                <td
                  className={
                    TABLE_CELL_CLASS +
                    (i === items.length - 1 ? " " + TABLE_CELL_LAST : "")
                  }
                >
                  {row.name}
                </td>
                <td
                  className={
                    TABLE_CELL_CLASS +
                    (i === items.length - 1 ? " " + TABLE_CELL_LAST : "")
                  }
                >
                  {row.value ?? "—"}
                </td>
                <td
                  className={
                    TABLE_CELL_CLASS +
                    (i === items.length - 1 ? " " + TABLE_CELL_LAST : "")
                  }
                >
                  {row.destructionValue ?? "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Carte d’édition pour une section (titre + contenu). */
export function EditCard({
  title,
  id,
  hint,
  children,
}: {
  title: string;
  id: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={TABLE_CARD_CLASS}>
      <h2 className={TABLE_HEAD_CLASS}>{title}</h2>
      <div className="px-4 py-3">
        <p className="mb-2 text-xs text-sheriff-paper-muted/90">{hint}</p>
        {children}
      </div>
    </section>
  );
}
