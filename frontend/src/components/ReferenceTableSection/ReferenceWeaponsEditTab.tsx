"use client";

import type { ReferenceData } from "@/lib/reference";
import { EditCard, WEAPON_TYPES, TABLE_HEAD_CLASS } from "./shared";
import type { WeaponKeys } from "./shared";

const INPUT_CLASS =
  "w-full rounded border border-sheriff-gold/30 bg-sheriff-charcoal/50 px-3 py-2 text-sm text-sheriff-paper placeholder:text-sheriff-paper-muted/60 focus:border-sheriff-gold/60 focus:outline-none focus:ring-1 focus:ring-sheriff-gold/30";

type Props = {
  draft: ReferenceData;
  setDraft: React.Dispatch<React.SetStateAction<ReferenceData>>;
};

export function ReferenceWeaponsEditTab({ draft, setDraft }: Props) {
  return (
    <div className="space-y-6 pt-4">
      {WEAPON_TYPES.map(({ key, label }) => {
        const list = draft[key] ?? [];
        return (
          <EditCard
            key={key}
            id={`edit-${key}`}
            title={label}
            hint="Le prix de destruction ($) est utilisé pour le total lors de la validation d'une destruction."
          >
            <div className="space-y-3">
              <div className="sheriff-table-scroll overflow-x-auto rounded-md border border-sheriff-gold/20">
                <table
                  className="min-w-full text-left text-sm"
                  role="grid"
                  aria-label={`Liste des ${label.toLowerCase()}`}
                >
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className={TABLE_HEAD_CLASS + " min-w-48"}
                      >
                        Nom de l&apos;arme
                      </th>
                      <th
                        scope="col"
                        className={TABLE_HEAD_CLASS + " w-36"}
                      >
                        Prix destruction ($)
                      </th>
                      <th
                        scope="col"
                        className={TABLE_HEAD_CLASS + " w-12"}
                        aria-label="Supprimer la ligne"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((entry, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-sheriff-gold/15 transition hover:bg-sheriff-gold/5"
                      >
                        <td className="px-3 py-2 align-middle">
                          <input
                            type="text"
                            value={entry.name}
                            onChange={(e) => {
                              const next = [...list];
                              next[idx] = {
                                ...next[idx],
                                name: e.target.value,
                              };
                              setDraft((d) => ({ ...d, [key]: next }));
                            }}
                            onBlur={() => {
                              const next = list
                                .map((e) => ({
                                  name: e.name.trim(),
                                  destructionValue: e.destructionValue,
                                }))
                                .filter((e) => e.name !== "");
                              if (
                                JSON.stringify(next) !== JSON.stringify(list)
                              ) {
                                setDraft((d) => ({ ...d, [key]: next }));
                              }
                            }}
                            placeholder={`ex. ${label}`}
                            className={INPUT_CLASS + " w-full"}
                            aria-label="Nom de l'arme"
                          />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={entry.destructionValue ?? ""}
                            onChange={(e) => {
                              const next = [...list];
                              next[idx] = {
                                ...next[idx],
                                destructionValue:
                                  e.target.value || undefined,
                              };
                              setDraft((d) => ({ ...d, [key]: next }));
                            }}
                            placeholder="0"
                            className={INPUT_CLASS + " w-full tabular-nums"}
                            aria-label="Prix de destruction en dollars"
                          />
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                [key]: list.filter((_, i) => i !== idx),
                              }))
                            }
                            className="sheriff-focus-ring sheriff-btn-destructive-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition hover:bg-sheriff-gold/10"
                            title="Supprimer cette ligne"
                            aria-label="Supprimer cette ligne"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    [key]: [...(d[key] ?? []), { name: "", destructionValue: "" }],
                  }))
                }
                className="sheriff-focus-ring inline-flex items-center gap-2 rounded-lg border border-dashed border-sheriff-gold/50 bg-sheriff-charcoal/40 px-4 py-2.5 text-sm font-medium text-sheriff-gold/95 transition hover:border-sheriff-gold/70 hover:bg-sheriff-gold/10"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Ajouter une ligne
              </button>
            </div>
          </EditCard>
        );
      })}
    </div>
  );
}
