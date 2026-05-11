/**
 * Minimal shape for sheriff dropdown options (matches /api/sheriffs + SheriffOption).
 */
export type SheriffOptionLike = { username: string; displayName?: string };

/** Value and label for selects: Discord guild display (nick) when available. */
export function sheriffSelectValue(s: SheriffOptionLike): string {
  const v = (s.displayName ?? s.username).trim();
  return v !== "" ? v : s.username;
}

/**
 * Maps a stored sheriff string (legacy DB username or current display name) to the
 * canonical select value so controlled <select> / OptionSelect stay in sync.
 */
export function normalizeStoredSheriffSelectValue(
  stored: string,
  sheriffs: SheriffOptionLike[],
): string {
  const t = stored.trim();
  if (!t) return "";
  if (sheriffs.some((s) => sheriffSelectValue(s) === t)) return t;
  const match = sheriffs.find((s) => s.username === t);
  if (match) return sheriffSelectValue(match);
  return t;
}
