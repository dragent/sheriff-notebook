import type { ServiceRecordFull } from "@/components/dashboard/Dashboard";

/** A sheriff returned by /api/sheriffs (used as the source of truth for the bureau roster). */
export type SheriffRef = {
  id: string;
  username: string;
  grade: string;
  recruitedAt: string | null;
};

/** Pairing of a sheriff with their service record (or null when no record exists yet). */
export type BureauRow = {
  sheriff: SheriffRef;
  record: ServiceRecordFull | null;
};

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
