export const PLANNING_COLUMNS: { key: string; label: string }[] = [
  { key: "monDay", label: "Lun (J)" },
  { key: "monNight", label: "Lun (S)" },
  { key: "tueDay", label: "Mar (J)" },
  { key: "tueNight", label: "Mar (S)" },
  { key: "wedDay", label: "Mer (J)" },
  { key: "wedNight", label: "Mer (S)" },
  { key: "thuDay", label: "Jeu (J)" },
  { key: "thuNight", label: "Jeu (S)" },
  { key: "friDay", label: "Ven (J)" },
  { key: "friNight", label: "Ven (S)" },
  { key: "satDay", label: "Sam (J)" },
  { key: "satNight", label: "Sam (S)" },
  { key: "sunDay", label: "Dim (J)" },
  { key: "sunNight", label: "Dim (S)" },
];

/**
 * Two-level descriptor for the planning grid: each day groups two columns
 * (Jour / Soir). Lets the planning header render as a "grand livre" with a
 * fused day row above the J/S row.
 */
export const PLANNING_DAY_GROUPS: ReadonlyArray<{
  /** Short day label (e.g. "Lun"). */
  label: string;
  /** Long day label for tooltips and ARIA. */
  fullLabel: string;
  /** Keys of PLANNING_COLUMNS this day groups, in [day, night] order. */
  keys: readonly [string, string];
}> = [
  { label: "Lun", fullLabel: "Lundi", keys: ["monDay", "monNight"] },
  { label: "Mar", fullLabel: "Mardi", keys: ["tueDay", "tueNight"] },
  { label: "Mer", fullLabel: "Mercredi", keys: ["wedDay", "wedNight"] },
  { label: "Jeu", fullLabel: "Jeudi", keys: ["thuDay", "thuNight"] },
  { label: "Ven", fullLabel: "Vendredi", keys: ["friDay", "friNight"] },
  { label: "Sam", fullLabel: "Samedi", keys: ["satDay", "satNight"] },
  { label: "Dim", fullLabel: "Dimanche", keys: ["sunDay", "sunNight"] },
];
