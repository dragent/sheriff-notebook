/** Ledger entries tracked client-side for the « Erreur de saisie » Discord report. */

export type SaisieKind = "item" | "weapon" | "cash";

export type CorrectionLedgerEntry =
  | {
      key: string;
      action: "delete";
      kind: SaisieKind;
      label: string;
      date: string;
      quantity: number;
    }
  | {
      key: string;
      action: "qty_down";
      kind: SaisieKind;
      label: string;
      date: string;
      fromQty: number;
      toQty: number;
    };

export type SaisieCorrectionStockSnapshot = {
  weaponLines: Array<{ name: string; qty: number }>;
  itemLines: Array<{ name: string; qty: number }>;
  cashTotal: number;
  cashLineCount: number;
};

export function describeSaisieRowForLedger(row: {
  kind: SaisieKind;
  itemName: string;
  weaponModel: string;
  serialNumber: string;
}): string {
  if (row.kind === "cash") return "Dollares saisis";
  if (row.kind === "weapon") {
    const m = row.weaponModel.trim() || "Arme";
    const s = row.serialNumber.trim();
    return s ? `${m} (n° ${s})` : m;
  }
  return row.itemName.trim() || "Item";
}

function formatStockBlock(stocks: SaisieCorrectionStockSnapshot): string {
  const w =
    stocks.weaponLines.length === 0
      ? "Aucune arme."
      : stocks.weaponLines.map((l) => `  • ${l.name} — qté **${l.qty}**`).join("\n");
  const i =
    stocks.itemLines.length === 0
      ? "Aucun item."
      : stocks.itemLines.map((l) => `  • ${l.name} — qté **${l.qty}**`).join("\n");
  const cash = `**$${stocks.cashTotal.toLocaleString("fr-FR")}** (${stocks.cashLineCount} ligne${stocks.cashLineCount > 1 ? "s" : ""})`;
  return [
    "**Stocks saisis actuels** (hors lignes annulées)",
    "",
    "**Armes**",
    w,
    "",
    "**Items**",
    i,
    "",
    "**Dollares (cumul des lignes cash)**",
    `  ${cash}`,
  ].join("\n");
}

export function formatCorrectionLedgerLinePlain(e: CorrectionLedgerEntry): string {
  if (e.action === "delete") {
    const q = e.kind === "cash" ? `$${e.quantity.toLocaleString("fr-FR")}` : `${e.quantity}`;
    return `**Suppression** — ${e.label} — ${q} (${e.date})`;
  }
  const removed = e.fromQty - e.toQty;
  const unit = e.kind === "cash" ? "$" : "";
  return `**Quantité retirée** — ${e.label} — ${unit}${e.fromQty} → ${unit}${e.toQty} (−${unit}${removed}) (${e.date})`;
}

/**
 * Body passed to POST /api/saisies/notify-corrections (backend prepends « Erreur de saisie » title).
 */
export function buildSaisieCorrectionDiscordBody(
  entries: CorrectionLedgerEntry[],
  stocks: SaisieCorrectionStockSnapshot,
  maxLen = 1750
): string {
  const stockBlock = formatStockBlock(stocks);
  let corrections: string;
  if (entries.length === 0) {
    corrections = [
      "",
      "**Corrections enregistrées**",
      "",
      "_Aucune suppression ni baisse de quantité enregistrée sur cette session._",
    ].join("\n");
  } else {
    corrections =
      "\n\n**Corrections enregistrées**\n\n" +
      entries.map((e) => `• ${formatCorrectionLedgerLinePlain(e)}`).join("\n");
  }
  let out = stockBlock + corrections;
  if (out.length > maxLen) {
    out = out.slice(0, Math.max(0, maxLen - 40)) + "\n\n… _(message tronqué — trop long pour Discord)_";
  }
  return out;
}
