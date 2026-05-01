import { ALL_SHERIFF_GRADES, COMTE_ADJOINT_GRADES, GRADE_ORDER } from "@/lib/grades";

/**
 * Pure permission helpers used by the dashboard's HR actions
 * (delete / promote / demote / formation-edit). Extracted from Dashboard.tsx
 * so they can be unit-tested in isolation against the grade matrix.
 */

function ciEquals(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "base" }) === 0;
}

/**
 * Returns true if the current user can delete (or "remercier") the targeted
 * sheriff row.
 *
 * Rules:
 *  - actor must be Sheriff de comté or Adjoint
 *  - target must have a known grade
 *  - actor cannot delete their own row
 *  - actor with order 0 (Comté) can delete any other order
 *  - otherwise actor.order must be strictly less than target.order
 */
export function canDeleteSheriffRow(
  currentGrade: string | null | undefined,
  targetGrade: string | null | undefined,
  currentUsername: string | null | undefined,
  targetUsername: string,
): boolean {
  if (!currentGrade || !COMTE_ADJOINT_GRADES.has(currentGrade)) return false;
  if (!targetGrade) return false;
  if (!currentUsername) return false;
  if (ciEquals(targetUsername, currentUsername)) return false;
  const actorOrder = GRADE_ORDER[currentGrade] ?? null;
  const targetOrder = GRADE_ORDER[targetGrade] ?? null;
  if (actorOrder === null || targetOrder === null) return false;
  if (actorOrder === 0) return true;
  return actorOrder < targetOrder;
}

/**
 * Computes the next promotion grade allowed for `targetGrade`, capped by what
 * `currentGrade` is permitted to assign. Returns null when no promotion is
 * possible (e.g. actor is too low in the hierarchy or target is already at
 * the top).
 */
export function getNextPromotionGrade(
  currentGrade: string | null | undefined,
  targetGrade: string | null | undefined,
): string | null {
  if (!currentGrade || !targetGrade) return null;
  const actorOrder = GRADE_ORDER[currentGrade] ?? null;
  const targetOrder = GRADE_ORDER[targetGrade] ?? null;
  if (actorOrder === null || targetOrder === null) return null;
  if (actorOrder > 2) return null;
  if (actorOrder >= targetOrder) return null;
  let best: string | null = null;
  let bestOrder: number | null = null;
  for (const g of ALL_SHERIFF_GRADES) {
    const order = GRADE_ORDER[g] ?? null;
    if (order === null) continue;
    if (order >= targetOrder) continue;
    if (order < actorOrder) continue;
    if (bestOrder === null || order > bestOrder) {
      best = g;
      bestOrder = order;
    }
  }
  return best;
}

/**
 * Returns the immediate lower grade for `targetGrade` (one step demotion),
 * regardless of who the actor is. Use {@link canDemote} to gate the action.
 */
export function getNextDemotionGrade(
  targetGrade: string | null | undefined,
): string | null {
  if (!targetGrade) return null;
  const targetOrder = GRADE_ORDER[targetGrade] ?? null;
  if (targetOrder === null) return null;
  let next: string | null = null;
  let nextOrder: number | null = null;
  for (const g of ALL_SHERIFF_GRADES) {
    const order = GRADE_ORDER[g] ?? null;
    if (order === null) continue;
    if (order <= targetOrder) continue;
    if (nextOrder === null || order < nextOrder) {
      next = g;
      nextOrder = order;
    }
  }
  return next;
}

/**
 * Returns true if `currentGrade` is allowed to demote `targetGrade`. Mirrors
 * the backend rule: actor must be Comté/Adjoint/En chef (order ≤ 2) and
 * strictly above the target in hierarchy.
 */
export function canDemote(
  currentGrade: string | null | undefined,
  targetGrade: string | null | undefined,
): boolean {
  if (!currentGrade || !targetGrade) return false;
  const actorOrder = GRADE_ORDER[currentGrade] ?? null;
  const targetOrder = GRADE_ORDER[targetGrade] ?? null;
  if (actorOrder === null || targetOrder === null) return false;
  if (actorOrder > 2) return false;
  if (actorOrder >= targetOrder) return false;
  return true;
}

/**
 * Returns true when the current user can toggle a formation validation for
 * the given target row.
 */
export function canEditFormation(
  currentGrade: string | null | undefined,
  targetGrade: string | null | undefined,
  formationMaxGradeOrder: number,
  isOwnRow: boolean,
): boolean {
  if (currentGrade == null) return false;
  const actorOrder = GRADE_ORDER[currentGrade] ?? null;
  if (actorOrder === null) return false;
  // Formation reserved for higher tiers — locked.
  if (actorOrder > formationMaxGradeOrder) return false;
  if (isOwnRow) return currentGrade === "Sheriff de comté";
  if (targetGrade == null) return false;
  const targetOrder = GRADE_ORDER[targetGrade] ?? null;
  if (targetOrder === null) return false;
  return actorOrder <= 2 && actorOrder < targetOrder;
}
