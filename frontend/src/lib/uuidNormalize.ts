/**
 * Normalize UUID strings for reliable Map lookups (RFC 4122 case may differ between services).
 */
export function normalizeUuidString(value: string | null | undefined): string | null {
  if (value == null || typeof value !== "string") return null;
  const t = value.trim().toLowerCase();
  return t.length === 0 ? null : t;
}
