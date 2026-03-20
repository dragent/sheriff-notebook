'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SheriffOption } from "@/components/comptabilite/ComptabiliteSection";
import {
  SHERIFF_FIELD_DENSE as INPUT_BASE,
  SHERIFF_NATIVE_SELECT_DENSE as SELECT_BASE,
} from "@/lib/formFieldClasses";

const TOAST_DURATION_MS = 2500;
const INVENTORY_MAX_ITEMS = 50;

type SaisieRow = {
  id: string;
  date: string;
  sheriff: string;
  quantity: number | '';
  itemName: string;
  possessedBy: string;
  weaponModel: string;
  serialNumber: string;
  notes: string;
};

type SaisieType = 'item' | 'weapon';

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
  date: string;
  sheriff: string;
  quantity: number;
  itemName?: string;
  possessedBy?: string;
  weaponModel?: string;
  serialNumber?: string;
  notes?: string;
};

type SaisiesFormProps = {
  sheriffs: SheriffOption[];
  /** Armes groupées par catégorie (ex. Fusil, Carabine, Revolver). */
  weaponCategories: WeaponCategoryOption[];
  /** Items groupés par catégorie. */
  itemCategories: ItemCategoryOption[];
  /** Saisies déjà en base (chargées au rendu de la page). */
  initialRows?: InitialRowInput[];
};

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

/** Affiche un numéro de saisie court (8 premiers caractères) pour lisibilité, avec tooltip sur l’id complet. */
function formatSaisieNumero(id: string): string {
  return id.length >= 8 ? id.slice(0, 8) : id;
}

function createEmptyRow(defaultDate: string, defaultSheriff: string | null): SaisieRow {
  return {
    id: createId('row'),
    date: defaultDate,
    sheriff: defaultSheriff ?? '',
    quantity: 1,
    itemName: '',
    possessedBy: '',
    weaponModel: '',
    serialNumber: '',
    notes: '',
  };
}

type SortKey = 'name' | 'qty';
type SortDir = 'asc' | 'desc';

function recordToRow(r: InitialRowInput): SaisieRow {
  return {
    id: r.id,
    date: r.date,
    sheriff: r.sheriff,
    quantity: r.quantity,
    itemName: r.itemName ?? '',
    possessedBy: r.possessedBy ?? '',
    weaponModel: r.weaponModel ?? '',
    serialNumber: r.serialNumber ?? '',
    notes: r.notes ?? '',
  };
}

export function SaisiesForm({ sheriffs, weaponCategories, itemCategories, initialRows }: SaisiesFormProps) {
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
  const [toastLastSavedId, setToastLastSavedId] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [openModalType, setOpenModalType] = useState<SaisieType | null>(null);
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

  /** Ferme le modal et rend le focus au bouton déclencheur. */
  const closeModal = useCallback(() => {
    setModalOpen(false);
    const trigger = openModalType === 'item' ? itemTriggerRef.current : weaponTriggerRef.current;
    setOpenModalType(null);
    requestAnimationFrame(() => trigger?.focus());
  }, [openModalType]);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const showToast = useCallback((savedId?: string) => {
    setToastLastSavedId(savedId ?? null);
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
    const primaryId = openModalType === 'item' ? 'saisie-item' : 'saisie-weapon';
    const focus = () => document.getElementById(primaryId)?.focus();
    const t = setTimeout(focus, 50);
    return () => clearTimeout(t);
  }, [modalOpen, openModalType]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultSheriff = sheriffs[0]?.username ?? null;

  const [rows, setRows] = useState<SaisieRow[]>(() =>
    initialRows?.length ? initialRows.map(recordToRow) : []
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
      if (!row.itemName || !row.quantity || typeof row.quantity !== 'number') continue;
      const key = row.itemName.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + row.quantity);
    }
    return Array.from(map.entries()).slice(0, INVENTORY_MAX_ITEMS);
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
          sheriffs[0]?.username ?? null
        );
      const next: SaisieRow = {
        ...template,
        id: createId('row'),
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
    setForm({
      type: initialType,
      date: todayIso,
      sheriff: defaultSheriff ?? '',
      quantity: '1',
      itemName: '',
      possessedBy: '',
      weaponModel: '',
      serialNumber: '',
      notes: '',
    });
    setModalOpen(true);
  }

  function resetFormKeepingDateSheriff() {
    setForm((f) => ({
      ...f,
      quantity: '1',
      itemName: '',
      possessedBy: '',
      weaponModel: '',
      serialNumber: '',
      notes: '',
    }));
  }

  function buildRowFromForm(): SaisieRow | null {
    const quantity = Number.parseInt(form.quantity.replace(/\s/g, ''), 10);
    if (!form.date || !form.sheriff || Number.isNaN(quantity) || quantity <= 0) return null;
    const type: SaisieType = form.type;
    const base: SaisieRow = {
      id: createId('row'),
      date: form.date,
      sheriff: form.sheriff,
      quantity,
      itemName: '',
      possessedBy: form.possessedBy.trim(),
      weaponModel: '',
      serialNumber: form.serialNumber.trim(),
      notes: form.notes.trim(),
    };
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
    setToastError(null);
    setSaving(true);
    try {
      const body = {
        type: form.type,
        date: form.date,
        sheriff: form.sheriff,
        quantity: typeof row.quantity === 'number' ? row.quantity : 1,
        serialNumber: row.serialNumber || undefined,
        possessedBy: row.possessedBy || undefined,
        notes: row.notes || undefined,
        ...(form.type === 'item' ? { itemName: row.itemName } : { weaponModel: row.weaponModel }),
      };
      const res = await fetch('/api/saisies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { id?: string; error?: string; date?: string; sheriff?: string; quantity?: number; itemName?: string | null; weaponModel?: string | null; serialNumber?: string | null; possessedBy?: string | null; notes?: string | null };
      if (!res.ok) {
        setToastError(data?.error ?? `Erreur ${res.status}. Réessayez.`);
        return;
      }
      const savedRow = recordToRow({
        id: data.id ?? row.id,
        date: data.date ?? row.date,
        sheriff: data.sheriff ?? row.sheriff,
        quantity: typeof data.quantity === 'number' ? data.quantity : (row.quantity as number),
        itemName: data.itemName ?? undefined,
        weaponModel: data.weaponModel ?? undefined,
        serialNumber: data.serialNumber ?? undefined,
        possessedBy: data.possessedBy ?? undefined,
        notes: data.notes ?? undefined,
      });
      setRows((current) => [...current, savedRow]);
      showToast(data.id ?? savedRow.id);
      if (addAnother) {
        resetFormKeepingDateSheriff();
        requestAnimationFrame(() => {
          const primaryId = form.type === 'item' ? 'saisie-item' : 'saisie-weapon';
          document.getElementById(primaryId)?.focus();
        });
      } else {
        setModalOpen(false);
        setOpenModalType(null);
        const trigger = form.type === 'item' ? itemTriggerRef.current : weaponTriggerRef.current;
        requestAnimationFrame(() => trigger?.focus());
      }
    } finally {
      setSaving(false);
    }
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
            {toastLastSavedId && (
              <span className="ml-1.5 font-mono text-sheriff-gold" title={toastLastSavedId}>
                (n° {formatSaisieNumero(toastLastSavedId)})
              </span>
            )}
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
              Enregistrez une saisie (item ou arme) via le formulaire, puis consultez les inventaires
              agrégés ci-dessous.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
                                    <td className="py-1 pr-3 text-sheriff-paper-muted">{row.date}</td>
                                    <td className="py-1 font-mono text-sheriff-paper-muted">
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
                {form.type === 'item' ? "Nouvelle saisie d'item" : "Nouvelle saisie d'arme"}
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
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: 'item' }))}
                  className={`sheriff-focus-ring flex-1 rounded-md border px-3 py-1.5 text-xs font-medium sm:text-sm ${
                    form.type === 'item'
                      ? 'border-sheriff-gold bg-sheriff-gold/20 text-sheriff-gold'
                      : 'border-sheriff-gold/30 bg-sheriff-charcoal/50 text-sheriff-paper-muted'
                  }`}
                >
                  Item
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: 'weapon' }))}
                  className={`sheriff-focus-ring flex-1 rounded-md border px-3 py-1.5 text-xs font-medium sm:text-sm ${
                    form.type === 'weapon'
                      ? 'border-sheriff-gold bg-sheriff-gold/20 text-sheriff-gold'
                      : 'border-sheriff-gold/30 bg-sheriff-charcoal/50 text-sheriff-paper-muted'
                  }`}
                >
                  Arme
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
                      <option key={s.id} value={s.username}>
                        {s.username}
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
                    Quantité
                  </label>
                  <input
                    id="saisie-qty"
                    type="number"
                    min={1}
                    required
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    className={INPUT_BASE}
                  />
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
              ) : (
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
                      className={`${INPUT_BASE} font-mono text-[11px] sm:text-xs`}
                      placeholder="Optionnel"
                    />
                  </div>
                </div>
              )}

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
                  {saving ? 'Enregistrement…' : 'Enregistrer et ajouter une autre'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="sheriff-focus-ring sheriff-btn-save rounded-md px-4 py-1.5 text-xs font-medium disabled:opacity-60 sm:text-sm"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer la saisie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

