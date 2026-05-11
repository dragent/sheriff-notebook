'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SheriffOption } from "@/components/comptabilite/ComptabiliteSection";
import {
  normalizeStoredSheriffSelectValue,
  sheriffSelectValue,
} from "@/lib/sheriffOptions";
import {
  SHERIFF_FIELD_DENSE as INPUT_BASE,
  SHERIFF_NATIVE_SELECT_DENSE as SELECT_BASE,
} from "@/lib/formFieldClasses";
import {
  buildSaisieCorrectionDiscordBody,
  describeSaisieRowForLedger,
  formatCorrectionLedgerSummaryUi,
  type CorrectionLedgerEntry,
} from "@/lib/saisieCorrectionReport";

const TOAST_DURATION_MS = 2500;
const INVENTORY_MAX_ITEMS = 50;

const dollarsIntl = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Display seized dollar totals (up to 2 decimal places). */
function formatSeizedDollars(amount: number): string {
  return dollarsIntl.format(Math.max(0, amount));
}

const cashQtyDisplayIntl = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatCashQuantityForList(amount: number): string {
  return cashQtyDisplayIntl.format(amount);
}

/** Parse modal quantity: cash accepts `,` or `.` and up to 2 decimals; item/weapon must be a positive integer. */
function parseSeizureQuantityInput(raw: string, type: SaisieType): number | null {
  const trimmed = raw.trim().replace(/\u00a0/g, '').replace(/\s/g, '');
  if (trimmed === '') return null;
  const normalized = trimmed.replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (type === 'cash') {
    const cents = Math.round(n * 100);
    const rounded = cents / 100;
    if (cents < 1) return null;
    return rounded;
  }
  if (!Number.isInteger(n)) return null;
  return n;
}

type SaisieType = 'item' | 'weapon' | 'cash';

type SaisieRow = {
  id: string;
  kind: SaisieType;
  date: string;
  sheriff: string;
  quantity: number | '';
  itemName: string;
  possessedBy: string;
  weaponModel: string;
  serialNumber: string;
  notes: string;
  cancelledAt?: string | null;
  cancelledReason?: string | null;
  cancelledBy?: string | null;
};

type ModalFormState = {
  type: SaisieType;
  date: string;
  sheriff: string;
  quantity: string;
  itemName: string;
  possessedBy: string;
  weaponModel: string;
  serialNumber: string;
  notes: string;
};

type WeaponCategoryOption = { label: string; weapons: string[] };
type ItemCategoryOption = { name: string; items: { name: string }[] };

/** Format des lignes passées par la page (API / chargement). */
type InitialRowInput = {
  id: string;
  type: SaisieType;
  date: string;
  sheriff: string;
  quantity: number;
  itemName?: string;
  possessedBy?: string;
  weaponModel?: string;
  serialNumber?: string;
  notes?: string;
  cancelledAt?: string | null;
  cancelledReason?: string | null;
  cancelledBy?: string | null;
};

type SaisiesFormProps = {
  sheriffs: SheriffOption[];
  /** Armes groupées par catégorie (ex. Fusil, Carabine, Revolver). */
  weaponCategories: WeaponCategoryOption[];
  /** Items groupés par catégorie. */
  itemCategories: ItemCategoryOption[];
  /** Sheriff de comté / Adjoint : suppression de ligne + rapport Discord « Erreur de saisie ». */
  canCorrectSaisieErrors?: boolean;
  /** Saisies déjà en base (chargées au rendu de la page). */
  initialRows?: InitialRowInput[];
};

/** Identifiants renvoyés par le backend (UUID) — évite d’exposer « Supprimer » sur des lignes locales non persistées. */
const PERSISTED_SAISIE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CELL_BASE =
  'border-b border-sheriff-gold/15 px-2.5 py-2 align-middle text-xs sm:text-sm text-sheriff-paper-muted';
const CELL_HEADER =
  'border-b border-sheriff-gold/40 bg-sheriff-charcoal/90 px-2.5 py-2 text-left font-heading text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-sheriff-gold sticky top-0 z-10 shadow-[0_2px_6px_rgba(0,0,0,0.4)]';

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyRow(defaultDate: string, defaultSheriff: string | null): SaisieRow {
  return {
    id: createId('row'),
    kind: 'item',
    date: defaultDate,
    sheriff: defaultSheriff ?? '',
    quantity: 1,
    itemName: '',
    possessedBy: '',
    weaponModel: '',
    serialNumber: '',
    notes: '',
    cancelledAt: null,
    cancelledReason: null,
    cancelledBy: null,
  };
}

type SortKey = 'name' | 'qty';
type SortDir = 'asc' | 'desc';

function recordToRow(r: InitialRowInput, sheriffList: SheriffOption[]): SaisieRow {
  return {
    id: r.id,
    kind: r.type,
    date: r.date,
    sheriff: normalizeStoredSheriffSelectValue(r.sheriff, sheriffList),
    quantity: r.quantity,
    itemName: r.itemName ?? '',
    possessedBy: r.possessedBy ?? '',
    weaponModel: r.weaponModel ?? '',
    serialNumber: r.serialNumber ?? '',
    notes: r.notes ?? '',
    cancelledAt: r.cancelledAt ?? null,
    cancelledReason: r.cancelledReason ?? null,
    cancelledBy: r.cancelledBy ?? null,
  };
}

export function SaisiesForm({
  sheriffs,
  weaponCategories,
  itemCategories,
  canCorrectSaisieErrors = false,
  initialRows,
}: SaisiesFormProps) {
  const weaponNames = useMemo(
    () =>
      Array.from(
        new Set(
          weaponCategories.flatMap((c) =>
            c.weapons.map((w) => w.trim()).filter((w) => w.length > 0)
          )
        )
      ),
    [weaponCategories]
  );
  const itemNames = itemCategories.flatMap((c) => c.items.map((i) => i.name));
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);
  const [openModalType, setOpenModalType] = useState<SaisieType | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [weaponSort, setWeaponSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'qty', dir: 'desc' });
  const [itemSort, setItemSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'qty', dir: 'desc' });
  const [saving, setSaving] = useState(false);
  /** Modèle d’arme dont le détail (date, n° série) est affiché. */
  const [expandedWeaponModel, setExpandedWeaponModel] = useState<string | null>(null);
  /** Catégories d’items ouvertes dans l’inventaire. */
  const [openItemCategories, setOpenItemCategories] = useState<string[]>(() =>
    itemCategories.map((c) => c.name)
  );

  const formRef = useRef<HTMLFormElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const itemTriggerRef = useRef<HTMLButtonElement>(null);
  const weaponTriggerRef = useRef<HTMLButtonElement>(null);
  const cashTriggerRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [correctionLedger, setCorrectionLedger] = useState<CorrectionLedgerEntry[]>([]);
  const [correctionStocksModalOpen, setCorrectionStocksModalOpen] = useState(false);
  /** Draft quantities in the correction modal (persisted rows only). */
  const [correctionQtyInputs, setCorrectionQtyInputs] = useState<Record<string, string>>({});
  const [correctionNotifySending, setCorrectionNotifySending] = useState(false);
  const [correctionNotifyFeedback, setCorrectionNotifyFeedback] = useState<string | null>(null);

  /** Ferme le modal et rend le focus au bouton déclencheur. */
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingRowId(null);
    const trigger =
      openModalType === 'item'
        ? itemTriggerRef.current
        : openModalType === 'weapon'
          ? weaponTriggerRef.current
          : cashTriggerRef.current;
    setOpenModalType(null);
    requestAnimationFrame(() => trigger?.focus());
  }, [openModalType]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (sheriffs.length === 0) return;
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        sheriff: normalizeStoredSheriffSelectValue(row.sheriff, sheriffs),
      })),
    );
    setForm((f) => ({
      ...f,
      sheriff: f.sheriff
        ? normalizeStoredSheriffSelectValue(f.sheriff, sheriffs)
        : f.sheriff,
    }));
  }, [sheriffs]);

  useEffect(() => {
    if (!toastVisible) return;
    const t = setTimeout(() => setToastVisible(false), TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [toastVisible]);

  useEffect(() => {
    if (!toastError) return;
    const t = setTimeout(() => setToastError(null), TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [toastError]);

  useEffect(() => {
    if (!correctionNotifyFeedback) return;
    const t = setTimeout(() => setCorrectionNotifyFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [correctionNotifyFeedback]);

  const showToast = useCallback(() => {
    setToastVisible(true);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        formRef.current?.requestSubmit();
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.from(focusable).filter((el) => !el.hasAttribute('disabled'));
      const idx = list.indexOf(document.activeElement as HTMLElement);
      if (idx === -1) return;
      if (!e.shiftKey && idx === list.length - 1) {
        e.preventDefault();
        list[0]?.focus();
      } else if (e.shiftKey && idx === 0) {
        e.preventDefault();
        list[list.length - 1]?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    if (!modalOpen) return;
    const primaryId =
      openModalType === 'item'
        ? 'saisie-item'
        : openModalType === 'weapon'
          ? 'saisie-weapon'
          : 'saisie-qty';
    const focus = () => document.getElementById(primaryId)?.focus();
    const t = setTimeout(focus, 50);
    return () => clearTimeout(t);
  }, [modalOpen, openModalType]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultSheriff = useMemo(
    () => (sheriffs[0] ? sheriffSelectValue(sheriffs[0]) : null),
    [sheriffs],
  );
  const currentMonthPrefix = useMemo(() => todayIso.slice(0, 7), [todayIso]);

  const [rows, setRows] = useState<SaisieRow[]>(() =>
    initialRows?.length ? initialRows.map((r) => recordToRow(r, sheriffs)) : []
  );

  const correctableRowsSorted = useMemo(
    () =>
      rows
        .filter((r) => !r.cancelledAt && PERSISTED_SAISIE_ID_RE.test(r.id))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [rows]
  );

  const correctionModalOpenedRef = useRef(false);
  useEffect(() => {
    if (correctionStocksModalOpen) {
      if (!correctionModalOpenedRef.current) {
        const initial: Record<string, string> = {};
        for (const r of rows) {
          if (r.cancelledAt || !PERSISTED_SAISIE_ID_RE.test(r.id)) continue;
          if (typeof r.quantity === 'number') initial[r.id] = String(r.quantity);
        }
        setCorrectionQtyInputs(initial);
        correctionModalOpenedRef.current = true;
      }
    } else {
      correctionModalOpenedRef.current = false;
    }
  }, [correctionStocksModalOpen, rows]);

  const historyRows = useMemo(
    () => rows.filter((r) => typeof r.date === 'string' && r.date.startsWith(currentMonthPrefix)),
    [rows, currentMonthPrefix]
  );
  const [form, setForm] = useState<ModalFormState>(() => ({
    type: 'item',
    date: todayIso,
    sheriff: defaultSheriff ?? '',
    quantity: '1',
    itemName: '',
    possessedBy: '',
    weaponModel: '',
    serialNumber: '',
    notes: '',
  }));

  const _totalQuantity = useMemo(
    () =>
      rows.reduce(
        (acc, row) => acc + (typeof row.quantity === 'number' ? row.quantity : 0),
        0
      ),
    [rows]
  );

  const weaponInventoryRaw = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.cancelledAt) continue;
      if (row.kind !== 'weapon') continue;
      if (!row.weaponModel || !row.quantity || typeof row.quantity !== 'number') continue;
      const key = row.weaponModel.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + row.quantity);
    }
    return Array.from(map.entries()).slice(0, INVENTORY_MAX_ITEMS);
  }, [rows]);

  const itemInventoryRaw = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.cancelledAt) continue;
      if (row.kind !== 'item') continue;
      if (!row.itemName || !row.quantity || typeof row.quantity !== 'number') continue;
      const key = row.itemName.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + row.quantity);
    }
    return Array.from(map.entries()).slice(0, INVENTORY_MAX_ITEMS);
  }, [rows]);

  const { totalCashDollars, cashEntryCount } = useMemo(() => {
    let total = 0;
    let count = 0;
    for (const row of rows) {
      if (row.cancelledAt) continue;
      if (row.kind !== 'cash' || typeof row.quantity !== 'number') continue;
      total += row.quantity;
      count += 1;
    }
    return { totalCashDollars: total, cashEntryCount: count };
  }, [rows]);

  const weaponInventory = useMemo(() => {
    const dir = weaponSort.dir === 'asc' ? 1 : -1;
    return [...weaponInventoryRaw].sort((a, b) => {
      if (weaponSort.key === 'qty') return dir * (a[1] - b[1]) || a[0].localeCompare(b[0], 'fr');
      return dir * a[0].localeCompare(b[0], 'fr') || (b[1] - a[1]);
    });
  }, [weaponInventoryRaw, weaponSort]);

  /** Pour chaque modèle d’arme, la liste des lignes de saisie (pour afficher date + n° série au clic). */
  const weaponRowsByModel = useMemo(() => {
    const map = new Map<string, SaisieRow[]>();
    for (const row of rows) {
      if (row.cancelledAt) continue;
      if (row.kind !== 'weapon') continue;
      const model = row.weaponModel?.trim();
      if (!model || typeof row.quantity !== 'number') continue;
      const list = map.get(model) ?? [];
      list.push(row);
      map.set(model, list);
    }
    return map;
  }, [rows]);

  const itemInventory = useMemo(() => {
    const dir = itemSort.dir === 'asc' ? 1 : -1;
    return [...itemInventoryRaw].sort((a, b) => {
      if (itemSort.key === 'qty') return dir * (a[1] - b[1]) || a[0].localeCompare(b[0], 'fr');
      return dir * a[0].localeCompare(b[0], 'fr') || (b[1] - a[1]);
    });
  }, [itemInventoryRaw, itemSort]);

  /** Inventaire items groupé par catégorie, avec total par catégorie. */
  const itemInventoryByCategory = useMemo(() => {
    if (itemInventory.length === 0) return [];

    const categoryByItemName = new Map<string, string>();
    for (const category of itemCategories) {
      for (const item of category.items) {
        categoryByItemName.set(item.name, category.name);
      }
    }

    type CategoryGroup = {
      category: string;
      totalQty: number;
      items: [string, number][];
    };

    const groupsMap = new Map<string, CategoryGroup>();

    for (const [name, qty] of itemInventory) {
      const categoryName = categoryByItemName.get(name) ?? 'Autres';
      const existing = groupsMap.get(categoryName);
      if (existing) {
        existing.items.push([name, qty]);
        existing.totalQty += qty;
      } else {
        groupsMap.set(categoryName, {
          category: categoryName,
          totalQty: qty,
          items: [[name, qty]],
        });
      }
    }

    const dir = itemSort.dir === 'asc' ? 1 : -1;

    const groups = Array.from(groupsMap.values());

    // Tri des catégories selon la clé actuelle (nom ou quantité totale).
    groups.sort((a, b) => {
      if (itemSort.key === 'qty') {
        return dir * (a.totalQty - b.totalQty) || a.category.localeCompare(b.category, 'fr');
      }
      return dir * a.category.localeCompare(b.category, 'fr') || (b.totalQty - a.totalQty);
    });

    // Tri des items à l’intérieur de chaque catégorie.
    for (const group of groups) {
      group.items.sort((a, b) => {
        if (itemSort.key === 'qty') return dir * (a[1] - b[1]) || a[0].localeCompare(b[0], 'fr');
        return dir * a[0].localeCompare(b[0], 'fr') || (b[1] - a[1]);
      });
    }

    return groups;
  }, [itemInventory, itemCategories, itemSort]);

  const _hasItemOptions = itemNames.length > 0;
  const hasWeaponOptions = weaponNames.length > 0;

  function _updateRow(id: string, patch: Partial<SaisieRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function _addRow(fromId?: string) {
    setRows((current) => {
      const base =
        fromId != null
          ? current.find((r) => r.id === fromId) ?? current[current.length - 1]
          : current[current.length - 1];
      const template =
        base ??
        createEmptyRow(
          todayIso,
          sheriffs[0] ? sheriffSelectValue(sheriffs[0]) : null
        );
      const next: SaisieRow = {
        ...template,
        id: createId('row'),
        kind: template.kind,
        quantity: template.quantity || 1,
      };
      return [...current, next];
    });
  }

  function _removeRow(id: string) {
    setRows((current) => (current.length <= 1 ? current : current.filter((row) => row.id !== id)));
  }

  function _resetRows() {
    setRows([]);
  }

  function openModal(initialType: SaisieType) {
    setOpenModalType(initialType);
    setEditingRowId(null);
    setForm({
      type: initialType,
      date: todayIso,
      sheriff: defaultSheriff ?? '',
      quantity: initialType === 'cash' ? '100' : '1',
      itemName: '',
      possessedBy: '',
      weaponModel: '',
      serialNumber: '',
      notes: '',
    });
    setModalOpen(true);
  }

  function openEdit(row: SaisieRow) {
    if (row.cancelledAt) return;
    setOpenModalType(row.kind);
    setEditingRowId(row.id);
    setForm({
      type: row.kind,
      date: row.date,
      sheriff: normalizeStoredSheriffSelectValue(row.sheriff, sheriffs),
      quantity:
        typeof row.quantity === 'number'
          ? row.kind === 'cash'
            ? String(Number.parseFloat(row.quantity.toFixed(2)))
            : String(row.quantity)
          : '1',
      itemName: row.itemName,
      possessedBy: row.possessedBy,
      weaponModel: row.weaponModel,
      serialNumber: row.serialNumber,
      notes: row.notes,
    });
    setModalOpen(true);
  }

  function resetFormKeepingDateSheriff() {
    setForm((f) => ({
      ...f,
      quantity: f.type === 'cash' ? '100' : '1',
      itemName: '',
      possessedBy: '',
      weaponModel: '',
      serialNumber: '',
      notes: '',
    }));
  }

  function buildRowFromForm(): SaisieRow | null {
    const quantity = parseSeizureQuantityInput(form.quantity, form.type);
    if (!form.date || !form.sheriff || quantity === null) return null;
    const type: SaisieType = form.type;
    const base: SaisieRow = {
      id: createId('row'),
      kind: type,
      date: form.date,
      sheriff: form.sheriff,
      quantity,
      itemName: '',
      possessedBy: form.possessedBy.trim(),
      weaponModel: '',
      serialNumber: form.serialNumber.trim(),
      notes: form.notes.trim(),
    };
    if (type === 'cash') {
      return { ...base, serialNumber: '' };
    }
    const row: SaisieRow =
      type === 'item'
        ? { ...base, itemName: form.itemName.trim() }
        : { ...base, weaponModel: form.weaponModel.trim() };
    if (type === 'item' && !row.itemName) return null;
    if (type === 'weapon' && !row.weaponModel) return null;
    return row;
  }

  async function handleSubmitModal(e: React.FormEvent, addAnother?: boolean) {
    e.preventDefault();
    const row = buildRowFromForm();
    if (!row) return;
    const editingIdAtStart = editingRowId;
    const prevRowForLedger =
      editingIdAtStart !== null ? rows.find((r) => r.id === editingIdAtStart) ?? null : null;
    setToastError(null);
    setSaving(true);
    try {
      const isEdit = editingRowId !== null;
      const includeQuantity = !isEdit || canCorrectSaisieErrors;
      const body =
        form.type === 'cash'
          ? {
              ...(!isEdit ? { type: form.type } : {}),
              date: form.date,
              sheriff: form.sheriff,
              ...(includeQuantity
                ? { quantity: typeof row.quantity === 'number' ? row.quantity : 1 }
                : {}),
              possessedBy: row.possessedBy || undefined,
              notes: row.notes || undefined,
            }
          : {
              ...(!isEdit ? { type: form.type } : {}),
              date: form.date,
              sheriff: form.sheriff,
              ...(includeQuantity
                ? { quantity: typeof row.quantity === 'number' ? row.quantity : 1 }
                : {}),
              serialNumber: row.serialNumber || undefined,
              possessedBy: row.possessedBy || undefined,
              notes: row.notes || undefined,
              ...(form.type === 'item' ? { itemName: row.itemName } : { weaponModel: row.weaponModel }),
            };
      const endpoint = isEdit ? `/api/saisies/${encodeURIComponent(editingRowId)}` : '/api/saisies';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        id?: string;
        error?: string;
        type?: string;
        date?: string;
        sheriff?: string;
        quantity?: number;
        itemName?: string | null;
        weaponModel?: string | null;
        serialNumber?: string | null;
        possessedBy?: string | null;
        notes?: string | null;
        cancelledAt?: string | null;
        cancelledReason?: string | null;
        cancelledBy?: string | null;
      };
      if (!res.ok) {
        setToastError(data?.error ?? `Erreur ${res.status}. Réessayez.`);
        return;
      }
      const savedRow = recordToRow(
        {
          id: (data.id ?? (isEdit ? editingRowId! : row.id)) as string,
          type: (data.type === 'item' || data.type === 'weapon' || data.type === 'cash' ? data.type : form.type) as SaisieType,
          date: data.date ?? row.date,
          sheriff: data.sheriff ?? row.sheriff,
          quantity: typeof data.quantity === 'number' ? data.quantity : (row.quantity as number),
          itemName: data.itemName ?? undefined,
          weaponModel: data.weaponModel ?? undefined,
          serialNumber: data.serialNumber ?? undefined,
          possessedBy: data.possessedBy ?? undefined,
          notes: data.notes ?? undefined,
          cancelledAt: data.cancelledAt ?? undefined,
          cancelledReason: data.cancelledReason ?? undefined,
          cancelledBy: data.cancelledBy ?? undefined,
        },
        sheriffs
      );
      if (isEdit) {
        setRows((current) => current.map((r) => (r.id === savedRow.id ? { ...r, ...savedRow } : r)));
      } else {
        setRows((current) => [...current, savedRow]);
      }
      if (isEdit && canCorrectSaisieErrors && includeQuantity && prevRowForLedger) {
        const pq = prevRowForLedger.quantity;
        const sq = savedRow.quantity;
        if (typeof pq === 'number' && typeof sq === 'number' && sq < pq) {
          setCorrectionLedger((prev) => [
            ...prev,
            {
              key: createId('ledger'),
              action: 'qty_down',
              kind: savedRow.kind,
              label: describeSaisieRowForLedger(savedRow),
              date: savedRow.date,
              fromQty: pq,
              toQty: sq,
            },
          ]);
        }
      }
      showToast();
      if (!isEdit && addAnother) {
        resetFormKeepingDateSheriff();
        requestAnimationFrame(() => {
          const primaryId =
            form.type === 'item'
              ? 'saisie-item'
              : form.type === 'weapon'
                ? 'saisie-weapon'
                : 'saisie-qty';
          document.getElementById(primaryId)?.focus();
        });
      } else {
        setModalOpen(false);
        setOpenModalType(null);
        setEditingRowId(null);
        const trigger =
          form.type === 'item'
            ? itemTriggerRef.current
            : form.type === 'weapon'
              ? weaponTriggerRef.current
              : cashTriggerRef.current;
        requestAnimationFrame(() => trigger?.focus());
      }
    } finally {
      setSaving(false);
    }
  }

  async function cancelRow(row: SaisieRow) {
    if (row.cancelledAt) return;
    const reason = window.prompt("Raison de l'annulation ?");
    if (!reason) return;
    setToastError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/saisies/${encodeURIComponent(row.id)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = (await res.json()) as { error?: string; cancelledAt?: string | null; cancelledReason?: string | null; cancelledBy?: string | null };
      if (!res.ok) {
        setToastError(data?.error ?? `Erreur ${res.status}. Réessayez.`);
        return;
      }
      setRows((current) =>
        current.map((r) =>
          r.id === row.id
            ? { ...r, cancelledAt: data.cancelledAt ?? new Date().toISOString(), cancelledReason: data.cancelledReason ?? reason, cancelledBy: data.cancelledBy ?? null }
            : r
        )
      );
      showToast();
    } finally {
      setSaving(false);
    }
  }

  async function deleteRowHard(row: SaisieRow) {
    if (!canCorrectSaisieErrors || !PERSISTED_SAISIE_ID_RE.test(row.id)) return;
    const ok = window.confirm(
      `Supprimer définitivement cette ligne de saisie (${getRowLabel(row)}, ${row.date}) ? Cette action est irréversible.`
    );
    if (!ok) return;
    setToastError(null);
    setCorrectionNotifyFeedback(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/saisies/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setToastError(data?.error ?? `Erreur ${res.status}. Réessayez.`);
        return;
      }
      setRows((current) => current.filter((r) => r.id !== row.id));
      setCorrectionQtyInputs((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setCorrectionLedger((prev) => [
        ...prev,
        {
          key: createId('ledger'),
          action: 'delete',
          kind: row.kind,
          label: describeSaisieRowForLedger(row),
          quantity: typeof row.quantity === 'number' ? row.quantity : 0,
          date: row.date,
        },
      ]);
    } finally {
      setSaving(false);
    }
  }

  async function applyRowQuantityFromCorrectionModal(row: SaisieRow) {
    if (!canCorrectSaisieErrors) return;
    const cur = typeof row.quantity === 'number' ? row.quantity : 0;
    const raw = (correctionQtyInputs[row.id] ?? String(cur)).replace(/\s/g, '');
    const newQty = Number.parseInt(raw, 10);
    if (Number.isNaN(newQty) || newQty < 1) {
      setCorrectionNotifyFeedback('Indiquez une quantité entière ≥ 1.');
      return;
    }
    if (newQty >= cur) {
      setCorrectionNotifyFeedback('La nouvelle quantité doit être inférieure à la quantité actuelle.');
      return;
    }
    setToastError(null);
    setCorrectionNotifyFeedback(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/saisies/${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        quantity?: number;
      };
      if (!res.ok) {
        setCorrectionNotifyFeedback(data?.error ?? `Erreur ${res.status}.`);
        return;
      }
      const updatedQty = typeof data.quantity === 'number' ? data.quantity : newQty;
      setRows((current) =>
        current.map((r) => (r.id === row.id ? { ...r, quantity: updatedQty } : r))
      );
      setCorrectionQtyInputs((prev) => ({ ...prev, [row.id]: String(updatedQty) }));
      setCorrectionLedger((prev) => [
        ...prev,
        {
          key: createId('ledger'),
          action: 'qty_down',
          kind: row.kind,
          label: describeSaisieRowForLedger(row),
          date: row.date,
          fromQty: cur,
          toQty: updatedQty,
        },
      ]);
    } finally {
      setSaving(false);
    }
  }

  async function submitCorrectionDiscordReport(message: string) {
    const msg = message.trim();
    if (!msg) {
      setCorrectionNotifyFeedback('Message vide.');
      return;
    }
    setCorrectionNotifySending(true);
    setCorrectionNotifyFeedback(null);
    setToastError(null);
    try {
      const res = await fetch('/api/saisies/notify-corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setCorrectionNotifyFeedback(data?.error ?? `Échec (${res.status}).`);
        return;
      }
      setCorrectionLedger([]);
      setCorrectionStocksModalOpen(false);
      setCorrectionNotifyFeedback('Rapport « Erreur de saisie » publié sur Discord.');
    } finally {
      setCorrectionNotifySending(false);
    }
  }

  function sendCorrectionReportFromModal() {
    if (correctionLedger.length === 0) {
      setCorrectionNotifyFeedback(
        'Effectuez au moins une suppression ou une baisse de quantité avant de publier sur Discord.'
      );
      return;
    }
    const snapshot = {
      weaponLines: weaponInventory.map(([name, qty]) => ({ name, qty })),
      itemLines: itemInventory.map(([name, qty]) => ({ name, qty })),
      cashTotal: totalCashDollars,
      cashLineCount: cashEntryCount,
    };
    const body = buildSaisieCorrectionDiscordBody(correctionLedger, snapshot);
    void submitCorrectionDiscordReport(body);
  }

  if (!mounted) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-sheriff-paper-muted">
          Chargement du formulaire de saisies…
        </p>
      </div>
    );
  }

  function getRowLabel(row: SaisieRow): string {
    if (row.kind === 'cash') return 'Dollares';
    if (row.kind === 'weapon') return row.weaponModel || 'Arme';
    return row.itemName || 'Item';
  }

  return (
    <div className="flex flex-col gap-6" suppressHydrationWarning>
      {toastVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-60 -translate-x-1/2 rounded-lg border border-sheriff-gold/40 bg-sheriff-wood px-4 py-3 shadow-lg"
        >
          <span className="text-sm font-medium text-sheriff-paper">
            Saisie enregistrée
          </span>
        </div>
      )}

      <section
        className="sheriff-card rounded-lg border border-sheriff-gold/30 bg-sheriff-wood p-4 shadow-sm sm:p-5"
        aria-label="Actions de saisie"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-sheriff-gold sm:text-base">
              Nouvelle saisie
            </h2>
            <p className="mt-1 text-xs text-sheriff-paper-muted">
              Enregistrez une saisie (item, arme ou dollares) via le formulaire, puis consultez les
              inventaires et le cumul monétaire ci-dessous.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setHistoryOpen((v) => !v);
                requestAnimationFrame(() => historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
              }}
              className="sheriff-focus-ring rounded-md border border-sheriff-gold/30 bg-sheriff-charcoal/60 px-3 py-1.5 text-xs font-medium text-sheriff-paper transition hover:bg-sheriff-gold/15 sm:text-sm"
              aria-expanded={historyOpen}
              aria-controls="saisies-history"
            >
              Voir l&apos;historique
            </button>
            <button
              ref={itemTriggerRef}
              type="button"
              onClick={() => openModal('item')}
              className="sheriff-focus-ring rounded-md border border-sheriff-gold/60 bg-sheriff-gold/15 px-3 py-1.5 text-xs font-medium text-sheriff-gold transition hover:bg-sheriff-gold/25 sm:text-sm"
            >
              + Saisie d&apos;item
            </button>
            <button
              ref={weaponTriggerRef}
              type="button"
              onClick={() => openModal('weapon')}
              className="sheriff-focus-ring rounded-md border border-sheriff-gold/40 bg-sheriff-charcoal/70 px-3 py-1.5 text-xs font-medium text-sheriff-paper transition hover:bg-sheriff-gold/15 sm:text-sm"
            >
              + Saisie d&apos;arme
            </button>
            <button
              ref={cashTriggerRef}
              type="button"
              onClick={() => openModal('cash')}
              className="sheriff-focus-ring rounded-md border border-sheriff-sortie/45 bg-sheriff-sortie-bg px-3 py-1.5 text-xs font-medium text-sheriff-sortie transition hover:bg-sheriff-sortie/20 sm:text-sm"
            >
              + Saisie de dollares
            </button>
            {canCorrectSaisieErrors ? (
              <button
                type="button"
                onClick={() => {
                  setCorrectionNotifyFeedback(null);
                  setCorrectionStocksModalOpen(true);
                }}
                disabled={correctionNotifySending}
                className="sheriff-focus-ring rounded-md border border-sheriff-sortie/50 bg-sheriff-sortie-bg px-3 py-1.5 text-xs font-medium text-sheriff-sortie transition hover:bg-sheriff-sortie/20 disabled:opacity-60 sm:text-sm"
              >
                Stocks et corrections (Discord)
              </button>
            ) : null}
          </div>
        </div>
        {canCorrectSaisieErrors && correctionNotifyFeedback && !correctionStocksModalOpen ? (
          <p
            className={`mt-3 text-xs ${correctionNotifyFeedback.includes('publié') ? 'text-emerald-400/90' : 'text-sheriff-sortie'}`}
            role="status"
          >
            {correctionNotifyFeedback}
          </p>
        ) : null}
      </section>

      <section
        ref={historyRef}
        id="saisies-history"
        aria-label="Historique des saisies"
        className="sheriff-card rounded-lg border border-sheriff-gold/30 bg-sheriff-charcoal/70 p-3 shadow-sm sm:p-4"
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-sheriff-gold sm:text-sm">
              Historique des saisies
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-sheriff-paper-muted/90">
              {historyRows.length === 0
                ? 'Aucune saisie enregistrée pour le mois en cours.'
                : `${historyRows.length} saisie${historyRows.length > 1 ? 's' : ''} affichée${historyRows.length > 1 ? 's' : ''} (mois en cours).`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="sheriff-focus-ring rounded-md border border-sheriff-gold/30 bg-sheriff-wood/10 px-3 py-1.5 text-xs font-medium text-sheriff-paper transition hover:bg-sheriff-gold/10 sm:text-sm"
            aria-expanded={historyOpen}
            aria-controls="saisies-history-table"
          >
            {historyOpen ? 'Masquer' : 'Afficher'}
          </button>
        </header>

        {historyOpen ? (
          historyRows.length === 0 ? (
            <div className="mt-3 rounded-md bg-sheriff-charcoal/50 p-3 text-[11px] text-sheriff-paper-muted/85">
              Aucune saisie pour le mois en cours. Utilise « + Saisie d&apos;item / arme / dollares » pour ajouter une entrée.
            </div>
          ) : (
            <div
              id="saisies-history-table"
              className="sheriff-table-scroll mt-3 overflow-auto rounded-md border border-sheriff-gold/10 bg-sheriff-charcoal/50"
            >
              <table className="w-full min-w-[700px] border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className={CELL_HEADER + ' py-1.5'}>Date</th>
                    <th className={CELL_HEADER + ' py-1.5'}>Sheriff</th>
                    <th className={CELL_HEADER + ' py-1.5'}>Type</th>
                    <th className={CELL_HEADER + ' py-1.5'}>Détail</th>
                    <th className={`${CELL_HEADER} w-24 py-1.5 text-right`}>Qté</th>
                    <th className={CELL_HEADER + ' py-1.5'}>Possédé par</th>
                    <th className={CELL_HEADER + ' py-1.5'}>Notes</th>
                    <th className={`${CELL_HEADER} w-32 py-1.5 text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        index % 2 === 1 ? 'bg-sheriff-charcoal/60' : 'bg-sheriff-charcoal/40'
                      } ${row.cancelledAt ? 'opacity-60' : 'hover:bg-sheriff-gold/5'}`}
                    >
                      <td className={CELL_BASE + ' font-stamp py-1.5 whitespace-nowrap'}>{row.date}</td>
                      <td className={CELL_BASE + ' py-1.5'}>{row.sheriff || '—'}</td>
                      <td className={CELL_BASE + ' py-1.5'}>
                        <span className="inline-flex rounded bg-sheriff-gold/10 px-1.5 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider text-sheriff-gold">
                          {row.kind === 'cash' ? 'cash' : row.kind}
                        </span>
                        {row.cancelledAt ? (
                          <span className="ml-2 inline-flex rounded bg-sheriff-sortie/15 px-1.5 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider text-sheriff-sortie">
                            annulée
                          </span>
                        ) : null}
                      </td>
                      <td className={CELL_BASE + ' py-1.5'}>
                        <span className="font-medium text-sheriff-paper">{getRowLabel(row)}</span>
                        {row.kind === 'cash' ? (
                          <span className="ml-1 text-[11px] text-sheriff-sortie/85">(dollares)</span>
                        ) : null}
                      </td>
                      <td className={`${CELL_BASE} py-1.5 text-right`}>
                        <span
                          className={`inline-flex min-w-7 justify-end rounded px-1.5 py-0.5 font-heading text-xs tabular-nums font-medium ${
                            row.kind === 'cash'
                              ? 'bg-sheriff-sortie/15 text-sheriff-sortie'
                              : 'bg-sheriff-gold/15 text-sheriff-gold'
                          }`}
                        >
                          {typeof row.quantity === 'number'
                            ? row.kind === 'cash'
                              ? formatCashQuantityForList(row.quantity)
                              : row.quantity
                            : 0}
                        </span>
                      </td>
                      <td className={CELL_BASE + ' py-1.5'}>{row.possessedBy || '—'}</td>
                      <td className={CELL_BASE + ' py-1.5'}>
                        <span className="block max-w-md truncate" title={row.notes || undefined}>
                          {row.notes || '—'}
                        </span>
                        {row.cancelledAt && row.cancelledReason ? (
                          <span className="mt-0.5 block text-[10px] text-sheriff-sortie/80" title={row.cancelledReason}>
                            Annulation : {row.cancelledReason}
                          </span>
                        ) : null}
                      </td>
                      <td className={`${CELL_BASE} py-1.5 text-right`}>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            disabled={saving || !!row.cancelledAt}
                            className="sheriff-focus-ring rounded-md border border-sheriff-gold/30 bg-sheriff-wood/10 px-2 py-1 text-[11px] font-medium text-sheriff-paper transition hover:bg-sheriff-gold/10 disabled:opacity-50"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelRow(row)}
                            disabled={saving || !!row.cancelledAt}
                            className="sheriff-focus-ring rounded-md border border-sheriff-sortie/40 bg-sheriff-sortie-bg px-2 py-1 text-[11px] font-medium text-sheriff-sortie transition hover:bg-sheriff-sortie/20 disabled:opacity-50"
                          >
                            Annuler
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <p className="mt-3 text-[11px] text-sheriff-paper-muted/80">
            Clique sur « Voir l&apos;historique » pour afficher la liste des saisies.
          </p>
        )}
      </section>

      <section aria-label="Total des dollares saisis">
        <div className="flex flex-col gap-3 text-sheriff-sortie sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center text-sheriff-sortie" aria-hidden>
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3v18M7 8.5h10M6.5 12h11M7 15.5h10"
                  stroke="currentColor"
                  strokeWidth={1.25}
                  strokeLinecap="round"
                />
                <rect
                  x={4}
                  y={5}
                  width={16}
                  height={14}
                  rx={2}
                  stroke="currentColor"
                  strokeWidth={1.25}
                  fill="none"
                  opacity={0.85}
                />
              </svg>
            </span>
            <div>
              <h3 className="font-heading text-xs font-semibold uppercase tracking-[0.26em] text-sheriff-sortie">
                Inventaire dollares
              </h3>
              <p className="mt-1 max-w-md text-[11px] leading-relaxed text-sheriff-sortie/85">
                Somme de toutes les saisies monétaires enregistrées (montants entrants, hors items du
                référentiel).
              </p>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-1 sm:items-end">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sheriff-sortie/80">Total saisi</p>
            <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
              <span className="mr-1">$</span>
              {formatSeizedDollars(totalCashDollars)}
            </p>
            <p className="text-[11px] text-sheriff-sortie/85">
              {cashEntryCount === 0
                ? 'Aucune ligne de cash — utilisez « Saisie de dollares ».'
                : `${cashEntryCount} saisie${cashEntryCount > 1 ? 's' : ''} comptabilisée${cashEntryCount > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <section className="sheriff-card rounded-lg border border-sheriff-gold/30 bg-sheriff-charcoal/70 p-3 shadow-sm sm:p-4">
          <header className="mb-2">
            <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-sheriff-gold sm:text-sm">
              Inventaire armes
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-sheriff-paper-muted/90">
              Synthèse des armes saisies (enregistrées en base), à jour après chaque ajout.
            </p>
          </header>
          {weaponInventory.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 rounded-md bg-sheriff-charcoal/50 py-4 text-center">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-sheriff-gold/10 text-sheriff-gold"
                aria-hidden
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </span>
              <p className="text-[11px] leading-snug text-sheriff-paper-muted/80">
                Aucune arme saisie. Utilisez « Saisie d&apos;arme » pour alimenter le tableau.
              </p>
            </div>
          ) : (
            <div className="sheriff-table-scroll mt-1.5 overflow-auto rounded-md border border-sheriff-gold/10 bg-sheriff-charcoal/50">
              <table className="w-full min-w-[200px] border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className={CELL_HEADER + ' py-1.5'}>
                      <button
                        type="button"
                        onClick={() =>
                          setWeaponSort((s) => ({
                            key: 'name',
                            dir: s.key === 'name' && s.dir === 'asc' ? 'desc' : 'asc',
                          }))
                        }
                        className="sheriff-focus-ring flex items-center gap-1 text-left"
                      >
                        Modèle
                        {weaponSort.key === 'name' && (
                          <span className="text-sheriff-gold/80" aria-hidden>
                            {weaponSort.dir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className={`${CELL_HEADER} w-20 py-1.5 text-right`}>
                      <button
                        type="button"
                        onClick={() =>
                          setWeaponSort((s) => ({
                            key: 'qty',
                            dir: s.key === 'qty' && s.dir === 'asc' ? 'desc' : 'asc',
                          }))
                        }
                        className="sheriff-focus-ring ml-auto flex w-full items-center justify-end gap-1"
                      >
                        Quantité
                        {weaponSort.key === 'qty' && (
                          <span className="text-sheriff-gold/80" aria-hidden>
                            {weaponSort.dir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weaponInventory.map(([name, qty], index) => {
                    const isExpanded = expandedWeaponModel === name;
                    const detailRows = weaponRowsByModel.get(name) ?? [];
                    return [
                      <tr
                        key={name}
                        className={`transition-colors ${index % 2 === 1 ? 'bg-sheriff-charcoal/60' : 'bg-sheriff-charcoal/40'} hover:bg-sheriff-gold/5`}
                      >
                        <td className={CELL_BASE + ' py-1.5'}>
                          <button
                            type="button"
                            onClick={() => setExpandedWeaponModel((prev) => (prev === name ? null : name))}
                            className="sheriff-focus-ring group flex w-full items-center gap-2 rounded py-0.5 text-left font-medium text-sheriff-paper transition hover:text-sheriff-gold"
                            aria-expanded={isExpanded}
                            aria-controls={`weapon-detail-${name.replace(/\s+/g, '-')}`}
                          >
                            <span
                              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sheriff-gold/15 text-sheriff-gold transition group-hover:bg-sheriff-gold/25"
                              aria-hidden
                            >
                              <svg
                                className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                viewBox="0 0 12 12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 4.5L6 7.5L9 4.5" />
                              </svg>
                            </span>
                            <span className="min-w-0 flex-1 truncate">{name}</span>
                          </button>
                        </td>
                        <td className={`${CELL_BASE} py-1.5 text-right`}>
                          <span className="inline-flex min-w-7 justify-end rounded bg-sheriff-gold/15 px-1.5 py-0.5 font-heading text-xs tabular-nums font-medium text-sheriff-gold">
                            {qty}
                          </span>
                        </td>
                      </tr>,
                      isExpanded && detailRows.length > 0 ? (
                        <tr key={`${name}-detail`} id={`weapon-detail-${name.replace(/\s+/g, '-')}`}>
                          <td colSpan={2} className={CELL_BASE + ' border-l-2 border-sheriff-gold/40 bg-sheriff-charcoal/95 py-2 pl-5 pr-2'}>
                            <table className="w-full border-collapse text-[11px]">
                              <thead>
                                <tr>
                                  <th className="pb-1 pr-3 text-left font-medium text-sheriff-gold/70">Date</th>
                                  <th className="pb-1 text-left font-medium text-sheriff-gold/70">N° de série</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailRows.map((row, i) => (
                                  <tr
                                    key={row.id}
                                    className={i % 2 === 1 ? 'bg-sheriff-charcoal/50' : ''}
                                  >
                                    <td className="font-stamp py-1 pr-3 text-sheriff-paper-muted">{row.date}</td>
                                    <td className="font-stamp py-1 text-sheriff-paper-muted">
                                      {row.serialNumber || '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      ) : null,
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="sheriff-card rounded-lg border border-sheriff-gold/30 bg-sheriff-charcoal/70 p-3 shadow-sm sm:p-4">
          <header className="mb-2">
            <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-sheriff-gold sm:text-sm">
              Inventaire items
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-sheriff-paper-muted/90">
              Synthèse des items saisis (enregistrés en base), utile pour comparer avec l&apos;inventaire du bureau.
            </p>
          </header>
          {itemInventoryByCategory.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 rounded-md bg-sheriff-charcoal/50 py-4 text-center">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-sheriff-gold/10 text-sheriff-gold"
                aria-hidden
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </span>
              <p className="text-[11px] leading-snug text-sheriff-paper-muted/80">
                Aucun item saisi. Utilisez « Saisie d&apos;item » pour alimenter le tableau.
              </p>
            </div>
          ) : (
            <div className="sheriff-table-scroll mt-1.5 overflow-auto rounded-md border border-sheriff-gold/10 bg-sheriff-charcoal/50">
              <table className="w-full min-w-[200px] border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className={CELL_HEADER + ' py-1.5'}>
                      <button
                        type="button"
                        onClick={() =>
                          setItemSort((s) => ({
                            key: 'name',
                            dir: s.key === 'name' && s.dir === 'asc' ? 'desc' : 'asc',
                          }))
                        }
                        className="sheriff-focus-ring flex items-center gap-1 text-left"
                      >
                        Item
                        {itemSort.key === 'name' && (
                          <span className="text-sheriff-gold/80" aria-hidden>
                            {itemSort.dir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className={`${CELL_HEADER} w-24 py-1.5 text-right`}>
                      <button
                        type="button"
                        onClick={() =>
                          setItemSort((s) => ({
                            key: 'qty',
                            dir: s.key === 'qty' && s.dir === 'asc' ? 'desc' : 'asc',
                          }))
                        }
                        className="sheriff-focus-ring ml-auto flex w-full items-center justify-end gap-1"
                      >
                        Quantité
                        {itemSort.key === 'qty' && (
                          <span className="text-sheriff-gold/80" aria-hidden>
                            {itemSort.dir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itemInventoryByCategory.map((group, groupIndex) => {
                    const isOpen = openItemCategories.includes(group.category);
                    return [
                      <tr
                        key={`${group.category}-header`}
                        className={`bg-sheriff-charcoal/80 hover:bg-sheriff-gold/10`}
                      >
                        <td className={CELL_BASE + ' py-1.5'}>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenItemCategories((prev) =>
                                prev.includes(group.category)
                                  ? prev.filter((c) => c !== group.category)
                                  : [...prev, group.category]
                              )
                            }
                            className="sheriff-focus-ring group flex w-full items-center gap-2 rounded py-0.5 text-left font-semibold text-sheriff-gold transition"
                            aria-expanded={isOpen}
                            aria-controls={`item-category-${groupIndex}`}
                          >
                            <span
                              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sheriff-gold/15 text-sheriff-gold transition group-hover:bg-sheriff-gold/25"
                              aria-hidden
                            >
                              <svg
                                className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                viewBox="0 0 12 12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 4.5L6 7.5L9 4.5" />
                              </svg>
                            </span>
                            <span className="truncate">{group.category}</span>
                          </button>
                        </td>
                        <td className={CELL_BASE + ' py-1.5 text-right'}>
                          <span className="inline-flex min-w-9 justify-end rounded bg-sheriff-gold/20 px-1.5 py-0.5 font-heading text-xs tabular-nums font-semibold text-sheriff-gold">
                            {group.totalQty}
                          </span>
                        </td>
                      </tr>,
                      ...(isOpen
                        ? group.items.map(([name, qty], index) => (
                            <tr
                              key={`${group.category}-${name}`}
                              id={index === 0 ? `item-category-${groupIndex}` : undefined}
                              className={`transition-colors ${
                                index % 2 === 1 ? 'bg-sheriff-charcoal/60' : 'bg-sheriff-charcoal/40'
                              } hover:bg-sheriff-gold/5`}
                            >
                              <td className={CELL_BASE + ' py-1.5 pl-7 font-medium text-sheriff-paper'}>
                                {name}
                              </td>
                              <td className={CELL_BASE + ' py-1.5 text-right'}>
                                <span className="inline-flex min-w-7 justify-end rounded bg-sheriff-gold/15 px-1.5 py-0.5 font-heading text-xs tabular-nums font-medium text-sheriff-gold">
                                  {qty}
                                </span>
                              </td>
                            </tr>
                          ))
                        : []),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Liste de suggestions armes (modèles) */}
      <datalist id="saisies-weapon-names">
        {weaponNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* Modal de saisie */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="saisie-modal-title"
        >
          <div
            ref={modalRef}
            className="sheriff-card w-full max-w-lg rounded-lg border border-sheriff-gold/40 bg-sheriff-wood p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2
                id="saisie-modal-title"
                className="font-heading text-base font-semibold uppercase tracking-wider text-sheriff-gold sm:text-lg"
              >
                {editingRowId
                  ? form.type === 'item'
                    ? "Modifier la saisie d'item"
                    : form.type === 'weapon'
                      ? "Modifier la saisie d'arme"
                      : 'Modifier la saisie de dollares'
                  : form.type === 'item'
                    ? "Nouvelle saisie d'item"
                    : form.type === 'weapon'
                      ? "Nouvelle saisie d'arme"
                      : 'Nouvelle saisie de dollares'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="sheriff-focus-ring rounded-full p-1.5 text-sheriff-paper-muted transition hover:bg-sheriff-charcoal/60 hover:text-sheriff-paper"
                aria-label="Fermer"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>

            <form
              ref={formRef}
              onSubmit={(e) => handleSubmitModal(e)}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: 'item', quantity: '1' }))}
                  className={`sheriff-focus-ring min-w-22 flex-1 rounded-md border px-2 py-1.5 text-xs font-medium sm:text-sm ${
                    form.type === 'item'
                      ? 'border-sheriff-gold bg-sheriff-gold/20 text-sheriff-gold'
                      : 'border-sheriff-gold/30 bg-sheriff-charcoal/50 text-sheriff-paper-muted'
                  }`}
                >
                  Item
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: 'weapon', quantity: '1' }))}
                  className={`sheriff-focus-ring min-w-22 flex-1 rounded-md border px-2 py-1.5 text-xs font-medium sm:text-sm ${
                    form.type === 'weapon'
                      ? 'border-sheriff-gold bg-sheriff-gold/20 text-sheriff-gold'
                      : 'border-sheriff-gold/30 bg-sheriff-charcoal/50 text-sheriff-paper-muted'
                  }`}
                >
                  Arme
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: 'cash', quantity: '100' }))}
                  className={`sheriff-focus-ring min-w-22 flex-1 rounded-md border px-2 py-1.5 text-xs font-medium sm:text-sm ${
                    form.type === 'cash'
                      ? 'border-sheriff-sortie bg-sheriff-sortie-bg text-sheriff-sortie'
                      : 'border-sheriff-sortie/30 bg-sheriff-charcoal/50 text-sheriff-paper-muted'
                  }`}
                >
                  Dollares
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="saisie-date"
                    className="mb-1 block text-xs font-medium text-sheriff-paper-muted"
                  >
                    Date
                  </label>
                  <input
                    id="saisie-date"
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className={INPUT_BASE}
                  />
                </div>
                <div>
                  <label
                    htmlFor="saisie-sheriff"
                    className="mb-1 block text-xs font-medium text-sheriff-paper-muted"
                  >
                    Sheriff
                  </label>
                  <select
                    id="saisie-sheriff"
                    required
                    value={form.sheriff}
                    onChange={(e) => setForm((f) => ({ ...f, sheriff: e.target.value }))}
                    className={SELECT_BASE}
                  >
                    <option value="">Choisir</option>
                    {sheriffs.map((s) => (
                      <option key={s.id} value={sheriffSelectValue(s)}>
                        {sheriffSelectValue(s)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="saisie-qty"
                    className="mb-1 block text-xs font-medium text-sheriff-paper-muted"
                  >
                    {form.type === 'cash' ? 'Montant saisi (dollares)' : 'Quantité'}
                  </label>
                  <input
                    id="saisie-qty"
                    type="number"
                    min={form.type === 'cash' ? 0.01 : 1}
                    step={form.type === 'cash' ? '0.01' : '1'}
                    inputMode={form.type === 'cash' ? 'decimal' : 'numeric'}
                    required
                    readOnly={!!editingRowId && !canCorrectSaisieErrors}
                    title={
                      editingRowId && !canCorrectSaisieErrors
                        ? 'Seuls le Sheriff de comté et le Sheriff Adjoint peuvent modifier la quantité.'
                        : undefined
                    }
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    className={
                      form.type === 'cash'
                        ? `${INPUT_BASE} border-sheriff-sortie/40 bg-sheriff-sortie-bg font-heading text-sheriff-sortie tabular-nums${editingRowId && !canCorrectSaisieErrors ? ' cursor-not-allowed opacity-80' : ''}`
                        : `${INPUT_BASE}${editingRowId && !canCorrectSaisieErrors ? ' cursor-not-allowed opacity-80' : ''}`
                    }
                  />
                  {editingRowId && !canCorrectSaisieErrors ? (
                    <p className="mt-1 text-[10px] text-sheriff-paper-muted/85">
                      Quantité figée — contactez le comté ou l’adjoint pour la corriger.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label
                    htmlFor="saisie-possede"
                    className="mb-1 block text-xs font-medium text-sheriff-paper-muted"
                  >
                    Possédé par
                  </label>
                  <input
                    id="saisie-possede"
                    type="text"
                    value={form.possessedBy}
                    onChange={(e) => setForm((f) => ({ ...f, possessedBy: e.target.value }))}
                    className={INPUT_BASE}
                    placeholder="Nom de la personne"
                  />
                </div>
              </div>

              {form.type === 'cash' ? (
                <p className="rounded-md border border-sheriff-sortie/35 px-3 py-2 text-[11px] leading-snug text-sheriff-sortie/85">
                  Indiquez le montant total confisqué pour cette saisie. Les sommes sont additionnées
                  dans la carte « Inventaire dollares ».
                </p>
              ) : null}

              {form.type === 'item' ? (
                <div>
                  <label
                    htmlFor="saisie-item"
                    className="mb-1 block text-xs font-medium text-sheriff-paper-muted"
                  >
                    Item saisi
                  </label>
                  <select
                    id="saisie-item"
                    required
                    value={form.itemName}
                    onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                    className={SELECT_BASE}
                  >
                    <option value="">Choisir un item</option>
                    {itemCategories.map((cat) => (
                      <optgroup key={cat.name} label={cat.name}>
                        {cat.items.map((item) => (
                          <option key={item.name} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ) : form.type === 'weapon' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)]">
                  <div>
                    <label
                      htmlFor="saisie-weapon"
                      className="mb-1 block text-xs font-medium text-sheriff-paper-muted"
                    >
                      Modèle d&apos;arme
                    </label>
                    {hasWeaponOptions ? (
                      <select
                        id="saisie-weapon"
                        required
                        value={form.weaponModel}
                        onChange={(e) => setForm((f) => ({ ...f, weaponModel: e.target.value }))}
                        className={SELECT_BASE}
                      >
                        <option value="">Choisir</option>
                        {weaponCategories.map((cat) => (
                          <optgroup key={cat.label} label={cat.label}>
                            {cat.weapons.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="saisie-weapon"
                        type="text"
                        list="saisies-weapon-names"
                        required
                        value={form.weaponModel}
                        onChange={(e) => setForm((f) => ({ ...f, weaponModel: e.target.value }))}
                        className={INPUT_BASE}
                        placeholder="Modèle"
                      />
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="saisie-serie"
                      className="mb-1 block text-xs font-medium text-sheriff-paper-muted"
                    >
                      N° de série
                    </label>
                    <input
                      id="saisie-serie"
                      type="text"
                      value={form.serialNumber}
                      onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                      className={`${INPUT_BASE} font-stamp text-[11px] sm:text-xs`}
                      placeholder="Optionnel"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="saisie-notes"
                  className="mb-1 block text-xs font-medium text-sheriff-paper-muted"
                >
                  Notes / dossier
                </label>
                <input
                  id="saisie-notes"
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className={INPUT_BASE}
                  placeholder="Contexte, n° de dossier, etc."
                />
              </div>

              <p className="mt-1 text-[11px] text-sheriff-paper-muted/80">
                Raccourci : Ctrl+Entrée (ou Cmd+Entrée) pour enregistrer.
              </p>
              {toastError && (
                <p role="alert" className="sheriff-text-error mt-2 text-xs">
                  {toastError}
                </p>
              )}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="sheriff-focus-ring sheriff-btn-secondary rounded-md px-4 py-1.5 text-xs font-medium disabled:opacity-60 sm:text-sm"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!formRef.current?.checkValidity()) {
                      formRef.current?.reportValidity();
                      return;
                    }
                    handleSubmitModal(e as unknown as React.FormEvent, true);
                  }}
                  className="sheriff-focus-ring sheriff-btn-save-soft rounded-md px-4 py-1.5 text-xs font-medium disabled:opacity-60 sm:text-sm"
                >
                  {editingRowId ? 'Enregistrer' : saving ? 'Enregistrement…' : 'Enregistrer et ajouter une autre'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="sheriff-focus-ring sheriff-btn-save rounded-md px-4 py-1.5 text-xs font-medium disabled:opacity-60 sm:text-sm"
                >
                  {saving ? 'Enregistrement…' : editingRowId ? 'Enregistrer les modifications' : 'Enregistrer la saisie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {correctionStocksModalOpen ? (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/65 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="correction-stocks-modal-title"
        >
          <div className="sheriff-card flex max-h-[min(92vh,760px)] w-full max-w-2xl flex-col rounded-lg border border-sheriff-sortie/45 bg-sheriff-wood p-4 shadow-xl sm:p-5">
            <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
              <div>
                <h2
                  id="correction-stocks-modal-title"
                  className="font-heading text-base font-semibold text-sheriff-sortie sm:text-lg"
                >
                  Comté / adjoint — stocks et corrections
                </h2>
                <p className="mt-1 text-[11px] text-sheriff-paper-muted">
                  Consultez les totaux, réduisez une quantité ou supprimez une ligne, puis validez pour publier le rapport
                  « Erreur de saisie » sur Discord (au moins une correction requise).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCorrectionStocksModalOpen(false);
                  setCorrectionNotifyFeedback(null);
                }}
                className="sheriff-focus-ring rounded-full p-1.5 text-sheriff-paper-muted transition hover:bg-sheriff-charcoal/60 hover:text-sheriff-paper"
                aria-label="Fermer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-md border border-sheriff-gold/15 bg-sheriff-charcoal/60 p-3 text-xs text-sheriff-paper sm:text-sm">
              <div>
                <h3 className="font-heading text-[11px] font-semibold uppercase tracking-wider text-sheriff-gold">
                  Armes (agrégé)
                </h3>
                {weaponInventory.length === 0 ? (
                  <p className="mt-1 text-[11px] text-sheriff-paper-muted">Aucune.</p>
                ) : (
                  <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto font-stamp text-[11px] leading-snug">
                    {weaponInventory.map(([name, qty]) => (
                      <li key={name}>
                        <span className="text-sheriff-paper">{name}</span>{' '}
                        <span className="tabular-nums text-sheriff-gold">× {qty}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="font-heading text-[11px] font-semibold uppercase tracking-wider text-sheriff-gold">
                  Items (agrégé)
                </h3>
                {itemInventory.length === 0 ? (
                  <p className="mt-1 text-[11px] text-sheriff-paper-muted">Aucun.</p>
                ) : (
                  <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto font-stamp text-[11px] leading-snug">
                    {itemInventory.map(([name, qty]) => (
                      <li key={name}>
                        <span className="text-sheriff-paper">{name}</span>{' '}
                        <span className="tabular-nums text-sheriff-gold">× {qty}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="font-heading text-[11px] font-semibold uppercase tracking-wider text-sheriff-sortie">
                  Dollares (lignes cash)
                </h3>
                <p className="mt-1 font-heading text-sm tabular-nums text-sheriff-sortie">
                  Total saisi : ${formatSeizedDollars(totalCashDollars)} — {cashEntryCount} ligne
                  {cashEntryCount > 1 ? 's' : ''}
                </p>
              </div>
              <div>
                <h3 className="font-heading text-[11px] font-semibold uppercase tracking-wider text-sheriff-gold">
                  Corriger les lignes (base)
                </h3>
                {correctableRowsSorted.length === 0 ? (
                  <p className="mt-1 text-[11px] text-sheriff-paper-muted">
                    Aucune ligne enregistrée en base à corriger (les brouillons locaux n’apparaissent pas ici).
                  </p>
                ) : (
                  <div className="sheriff-table-scroll mt-2 max-h-56 overflow-auto rounded border border-sheriff-gold/15">
                    <table className="w-full min-w-[560px] border-collapse text-left text-[10px] sm:text-[11px]">
                      <thead>
                        <tr className="border-b border-sheriff-gold/25 bg-sheriff-charcoal/90">
                          <th className="px-2 py-1.5 font-heading font-semibold text-sheriff-gold">Date</th>
                          <th className="px-2 py-1.5 font-heading font-semibold text-sheriff-gold">Type</th>
                          <th className="px-2 py-1.5 font-heading font-semibold text-sheriff-gold">Détail</th>
                          <th className="px-2 py-1.5 text-right font-heading font-semibold text-sheriff-gold">Qté actuelle</th>
                          <th className="px-2 py-1.5 font-heading font-semibold text-sheriff-gold">Nouvelle qté</th>
                          <th className="px-2 py-1.5 text-right font-heading font-semibold text-sheriff-gold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {correctableRowsSorted.map((row) => (
                          <tr key={row.id} className="border-b border-sheriff-gold/10">
                            <td className="px-2 py-1.5 font-stamp whitespace-nowrap text-sheriff-paper">{row.date}</td>
                            <td className="px-2 py-1.5 text-sheriff-paper-muted">
                              {row.kind === 'cash' ? 'cash' : row.kind}
                            </td>
                            <td className="max-w-[180px] truncate px-2 py-1.5 text-sheriff-paper" title={getRowLabel(row)}>
                              {getRowLabel(row)}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-sheriff-gold">
                              {row.kind === 'cash'
                                ? formatCashQuantityForList(typeof row.quantity === 'number' ? row.quantity : 0)
                                : typeof row.quantity === 'number'
                                  ? row.quantity
                                  : '—'}
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                min={1}
                                value={correctionQtyInputs[row.id] ?? ''}
                                onChange={(e) =>
                                  setCorrectionQtyInputs((p) => ({ ...p, [row.id]: e.target.value }))
                                }
                                disabled={saving}
                                className="sheriff-focus-ring w-full min-w-16 rounded border border-sheriff-gold/30 bg-sheriff-charcoal/80 px-1.5 py-1 text-[11px] tabular-nums text-sheriff-paper disabled:opacity-50"
                                aria-label={`Nouvelle quantité pour ${getRowLabel(row)}`}
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <div className="flex flex-wrap justify-end gap-1">
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => void applyRowQuantityFromCorrectionModal(row)}
                                  className="sheriff-focus-ring rounded border border-sheriff-gold/40 bg-sheriff-gold/10 px-2 py-0.5 text-[10px] font-medium text-sheriff-gold disabled:opacity-50"
                                >
                                  Appliquer
                                </button>
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => void deleteRowHard(row)}
                                  className="sheriff-focus-ring rounded border border-red-500/45 bg-red-950/50 px-2 py-0.5 text-[10px] font-medium text-red-200 disabled:opacity-50"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-heading text-[11px] font-semibold uppercase tracking-wider text-sheriff-gold">
                  Corrections suivies (cette session)
                </h3>
                {correctionLedger.length === 0 ? (
                  <p className="mt-1 text-[11px] italic text-sheriff-paper-muted">
                    Aucune suppression ni baisse de quantité enregistrée depuis le chargement de la page.
                  </p>
                ) : (
                  <ul className="mt-1 list-inside list-disc space-y-1 text-[11px] leading-snug text-sheriff-paper-muted">
                    {correctionLedger.map((e) => (
                      <li key={e.key}>{formatCorrectionLedgerSummaryUi(e)}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="font-heading text-[11px] font-semibold uppercase tracking-wider text-sheriff-paper-muted">
                  Texte qui sera envoyé (sans le titre Discord)
                </h3>
                <pre className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap rounded border border-sheriff-gold/20 bg-black/25 p-2 font-mono text-[10px] leading-relaxed text-sheriff-paper/90">
                  {buildSaisieCorrectionDiscordBody(correctionLedger, {
                    weaponLines: weaponInventory.map(([name, qty]) => ({ name, qty })),
                    itemLines: itemInventory.map(([name, qty]) => ({ name, qty })),
                    cashTotal: totalCashDollars,
                    cashLineCount: cashEntryCount,
                  })}
                </pre>
              </div>
            </div>

            {correctionNotifyFeedback && !correctionNotifyFeedback.startsWith('Rapport') ? (
              <p role="alert" className="mt-2 shrink-0 text-xs text-sheriff-sortie">
                {correctionNotifyFeedback}
              </p>
            ) : null}

            <div className="mt-3 flex shrink-0 flex-wrap justify-end gap-2 border-t border-sheriff-gold/15 pt-3">
              <button
                type="button"
                onClick={() => {
                  setCorrectionStocksModalOpen(false);
                  setCorrectionNotifyFeedback(null);
                }}
                disabled={correctionNotifySending}
                className="sheriff-focus-ring sheriff-btn-secondary rounded-md px-4 py-1.5 text-xs font-medium disabled:opacity-60 sm:text-sm"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => void sendCorrectionReportFromModal()}
                disabled={correctionNotifySending || correctionLedger.length === 0}
                className="sheriff-focus-ring rounded-md border border-sheriff-sortie/50 bg-sheriff-sortie-bg px-4 py-1.5 text-xs font-medium text-sheriff-sortie transition hover:bg-sheriff-sortie/20 disabled:opacity-60 sm:text-sm"
              >
                {correctionNotifySending ? 'Envoi…' : 'Valider et publier sur Discord'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

