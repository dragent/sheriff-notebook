import type { ServiceRecordFull } from "@/components/dashboard/Dashboard";

/** A sheriff returned by /api/sheriffs (used as the source of truth for the bureau roster). */
export type SheriffRef = {
  id: string;
  username: string;
  /** Guild nick from Discord bot API when available. */
  displayName?: string;
  grade: string;
  recruitedAt: string | null;
};

/** Label shown in dashboard tables (Discord server nick when available). */
export function sheriffDisplayLabel(sheriff: Pick<SheriffRef, "username" | "displayName">): string {
  const label = (sheriff.displayName ?? sheriff.username).trim();
  return label !== "" ? label : sheriff.username;
}

/** Pairing of a sheriff with their service record (or null when no record exists yet). */
export type BureauRow = {
  sheriff: SheriffRef;
  record: ServiceRecordFull | null;
};

/**
 * True when a bureau row belongs to the current user.
 *
 * Matches on the stable Symfony user id (1:1 with the Discord account, unaffected
 * by username/nickname changes), mirroring the backend rule
 * `record.user.id === me.id`. Falls back to a case-insensitive name comparison only
 * when ids are unavailable (e.g. legacy unlinked records or `/api/me` without `id`).
 */
export function isOwnBureauRow(
  row: BureauRow,
  currentUserId: string | null | undefined,
  currentUsername: string | null | undefined,
): boolean {
  const recordUserId = row.record?.userId ?? null;
  if (currentUserId && recordUserId) {
    return recordUserId.trim().toLowerCase() === currentUserId.trim().toLowerCase();
  }
  const recordName = row.record?.name ?? null;
  if (!currentUsername || !recordName) return false;
  return recordName.localeCompare(currentUsername, undefined, { sensitivity: "base" }) === 0;
}

const SCOPE_UNSUPPORTED_WEAPON_TOKENS = [
  "pistolet",
  "revolver",
  "fusil a pompe",
  "fusil à pompe",
];

/** Tells if a given weapon name supports a scope (used to drive the "Scope X" columns). */
export function canDisplayScopeForWeapon(weapon: string | null | undefined): boolean {
  const value = weapon?.trim().toLowerCase() ?? "";
  if (!value) return false;
  return !SCOPE_UNSUPPORTED_WEAPON_TOKENS.some((token) => value.includes(token));
}

/** Joins cart and boat info for the weapons tab "Calèche / Bateau" cell. */
export function formatCartAndBoat(
  cartInfo: string | null,
  boatInfo: string | null,
): string {
  const cart = cartInfo?.trim()
    ? cartInfo.split("\n").map((s) => s.trim()).filter(Boolean).join(", ")
    : "";
  const boat = boatInfo?.trim()
    ? boatInfo.split("\n").map((s) => s.trim()).filter(Boolean).join(", ")
    : "";
  if (cart && boat) return `${cart} — Bateau: ${boat}`;
  if (cart) return cart;
  if (boat) return boat;
  return "—";
}
