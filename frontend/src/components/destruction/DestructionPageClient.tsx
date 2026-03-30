'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DestructionSaisieForm, type DestructionOption } from "./DestructionSaisieForm";
import { DestructionHistorique, type DestructionRecordItem } from "./DestructionHistorique";
import {
  DESTRUCTION_LINE_KEY_CASH,
  labelCashDestructionLine,
} from "@/lib/destructionCashKey";

type DestructionPageClientProps = {
  defaultDate: string;
};

type SaisieRecord = {
  type?: 'item' | 'weapon' | 'cash';
  itemName: string | null;
  weaponModel: string | null;
  quantity: number;
  serialNumber?: string | null;
};

async function fetchDestructions(): Promise<DestructionRecordItem[]> {
  try {
    const res = await fetch('/api/destructions', { cache: 'no-store' });
    if (!res.ok) return [];
    const raw = await res.text();
    let json: { data?: DestructionRecordItem[] };
    try {
      json = JSON.parse(raw) as { data?: DestructionRecordItem[] };
    } catch {
      return [];
    }
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

async function fetchSaisies(): Promise<SaisieRecord[]> {
  try {
    const res = await fetch('/api/saisies', { cache: 'no-store' });
    if (!res.ok) return [];
    const raw = await res.text();
    let json: { data?: SaisieRecord[] };
    try {
      json = JSON.parse(raw) as { data?: SaisieRecord[] };
    } catch {
      return [];
    }
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

function computeAvailableQuantities(
  saisies: SaisieRecord[],
  destructionRecords: DestructionRecordItem[]
): Record<string, number> {
  const seized: Record<string, number> = {};
  for (const s of saisies) {
    if (s.type === 'cash') {
      const k = DESTRUCTION_LINE_KEY_CASH;
      seized[k] = (seized[k] ?? 0) + (s.quantity || 0);
      continue;
    }
    const name = s.itemName ?? s.weaponModel ?? '';
    if (!name) continue;
    if (s.itemName != null && s.itemName !== '') {
      seized[name] = (seized[name] ?? 0) + (s.quantity || 0);
      continue;
    }
    const model = s.weaponModel ?? '';
    if (model) {
      seized[model] = (seized[model] ?? 0) + (s.quantity || 0);
      const serial = s.serialNumber?.trim();
      if (serial) {
        const key = `${model}|${serial}`;
        seized[key] = (seized[key] ?? 0) + (s.quantity || 0);
      }
    }
  }
  const destroyed: Record<string, number> = {};
  for (const rec of destructionRecords) {
    for (const line of rec.lines) {
      const name = line.destruction?.trim() ?? '';
      if (!name) continue;
      const qte = Number(line.qte) || 0;
      destroyed[name] = (destroyed[name] ?? 0) + qte;
      const pipe = name.indexOf('|');
      if (pipe >= 0) {
        const prefix = name.slice(0, pipe);
        if (prefix) destroyed[prefix] = (destroyed[prefix] ?? 0) + qte;
      }
    }
  }
  const available: Record<string, number> = {};
  for (const name of new Set([...Object.keys(seized), ...Object.keys(destroyed)])) {
    const v = (seized[name] ?? 0) - (destroyed[name] ?? 0);
    if (v > 0) available[name] = v;
  }
  return available;
}

const ARMES_SAISIES_GROUP = 'Armes saisies';
const ITEMS_SAISIS_GROUP = 'Items saisis';
const DOLLARS_SAISIS_GROUP = 'Dollars saisis';

function buildOptionsFromSaisiesOnly(saisies: SaisieRecord[]): DestructionOption[] {
  const options: DestructionOption[] = [];
  const seenWeaponWithoutSerial = new Set<string>();
  const seenWeaponSerial = new Set<string>();
  const seenItems = new Set<string>();
  let seenCashOption = false;

  for (const s of saisies) {
    if (s.type === 'cash') {
      if (!seenCashOption) {
        seenCashOption = true;
        options.push({
          name: DESTRUCTION_LINE_KEY_CASH,
          categoryName: DOLLARS_SAISIS_GROUP,
          displayLabel: labelCashDestructionLine(),
        });
      }
      continue;
    }
    if (s.weaponModel?.trim()) {
      const model = s.weaponModel.trim();
      const serial = s.serialNumber?.trim();
      if (serial) {
        const key = `${model}|${serial}`;
        if (!seenWeaponSerial.has(key)) {
          seenWeaponSerial.add(key);
          options.push({
            name: key,
            categoryName: ARMES_SAISIES_GROUP,
            displayLabel: `${model} (n° ${serial})`,
          });
        }
      } else {
        if (!seenWeaponWithoutSerial.has(model)) {
          seenWeaponWithoutSerial.add(model);
          options.push({ name: model, categoryName: ARMES_SAISIES_GROUP, displayLabel: model });
        }
      }
      continue;
    }
    const itemName = s.itemName?.trim();
    if (itemName && !seenItems.has(itemName)) {
      seenItems.add(itemName);
      options.push({ name: itemName, categoryName: ITEMS_SAISIS_GROUP, displayLabel: itemName });
    }
  }
  return options;
}

export function DestructionPageClient({
  defaultDate,
}: DestructionPageClientProps) {
  const [records, setRecords] = useState<DestructionRecordItem[]>([]);
  const [saisies, setSaisies] = useState<SaisieRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const availableQuantities = useMemo(
    () => computeAvailableQuantities(saisies, records),
    [saisies, records]
  );

  const optionsFromSaisiesOnly = useMemo(
    () => buildOptionsFromSaisiesOnly(saisies),
    [saisies]
  );

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [data, saisiesData] = await Promise.all([
        fetchDestructions(),
        fetchSaisies(),
      ]);
      setRecords(data);
      setSaisies(saisiesData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleValidate = useCallback(async (id: string, status: 'reussie' | 'perdue') => {
    const res = await fetch(`/api/destructions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data?.error ?? `Erreur ${res.status}`);
    }
    await refetch();
  }, [refetch]);

  return (
    <div className="flex flex-col gap-8">
      <DestructionSaisieForm
        destructionOptions={optionsFromSaisiesOnly}
        defaultDate={defaultDate}
        onSaved={refetch}
        availableQuantities={availableQuantities}
      />
      <DestructionHistorique
        records={records}
        onValidate={handleValidate}
        loading={loading}
      />
    </div>
  );
}
