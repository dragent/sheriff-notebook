/**
 * Must match {@see App\Entity\SeizureRecord::DESTRUCTION_LINE_KEY_CASH} (Symfony).
 * Payload field `destruction` on destruction lines.
 */
export const DESTRUCTION_LINE_KEY_CASH = '__cash_seizure__' as const;

export function isCashDestructionLine(destruction: string): boolean {
  return destruction.trim() === DESTRUCTION_LINE_KEY_CASH;
}

export function labelCashDestructionLine(): string {
  return 'Dollares saisis';
}
