"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { SectionTable } from "@/components/ui/SectionTable";
import { Tabs } from "@/components/ui/Tabs";
import { WeaponSelect } from "@/components/ui/WeaponSelect";
import { OptionSelect } from "@/components/ui/OptionSelect";
import type { WeaponCategoryOption } from "@/lib/reference";
import type { SheriffOption } from "@/components/comptabilite/ComptabiliteSection";
import { SHERIFF_FIELD_COMFORTABLE, SHERIFF_FIELD_DENSE } from "@/lib/formFieldClasses";

type CoffresTabId = "munitions" | "accessoires" | "recensement";
export type InventaireMunition = { type: string; quantite: number };

export type AccessoireBureau = { type: string; bureau: number };

export type ArmeRecensement = {
  id: string;
  modele: string;
  numeroSerie: string;
  pret: boolean;
  coffre: boolean;
  lunette: boolean;
  assigne: string;
};

export type CoffresData = {
  inventaire: InventaireMunition[];
  accessoiresBureau: AccessoireBureau[];
  recensement: ArmeRecensement[];
};

const TABLE_HEAD =
  "border-b border-sheriff-gold/40 bg-sheriff-charcoal/90 px-3 py-2.5 text-left font-heading text-xs font-semibold uppercase tracking-wider text-sheriff-gold";
const TABLE_CELL = "px-3 py-2.5 text-sm text-sheriff-paper-muted";
const TABLE_ROW_ALT = "bg-sheriff-charcoal/25";
const TYPES_MUNITION = [
  "Munition de revolver",
  "Munition de pistolet",
  "Chevrotine",
  "Munition Carabine",
  "Munition de fusil",
  "Munition tranquillisante",
];

const TYPES_ACCESSOIRES_BUREAU = [
  "Étoile de sheriff",
  "Plat",
  "Boisson",
  "Appareil photo",
  "Jumelle",
  "Menotte",
  "Fumigène Rouge",
  "Fumigène Bleu",
  "Fumigène Blanc",
  "Fumigène Cyan",
  "Fumigène Noir",
  "Fumigène Rose",
  "Fumigène Vert",
  "Fumigène Jaune",
];

function IconMunitions({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M4 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2H0v-8a2 2 0 0 1 2-2h2V4Z" />
    </svg>
  );
}

function IconAccessoires({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4Zm2 6a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H7Z" clipRule="evenodd" />
    </svg>
  );
}

function IconRecensement({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4Zm2 6a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H7Z" clipRule="evenodd" />
    </svg>
  );
}

/**
 * Valeurs par défaut pour l’inventaire munitions.
 */
function defaultInventaire(): InventaireMunition[] {
  return TYPES_MUNITION.map((type) => ({ type, quantite: 0 }));
}

/**
 * Valeurs par défaut pour les accessoires du bureau.
 */
function defaultAccessoiresBureau(): AccessoireBureau[] {
  return TYPES_ACCESSOIRES_BUREAU.map((type) => ({ type, bureau: 0 }));
}

/**
 * Construit l’état initial à partir des données ou des défauts.
 */
function buildInitialState(data: CoffresData | null): CoffresData {
  if (!data) {
    return {
      inventaire: defaultInventaire(),
      accessoiresBureau: defaultAccessoiresBureau(),
      recensement: [],
    };
  }
  const inventaire =
    data.inventaire?.length > 0
      ? data.inventaire
      : defaultInventaire();
  const accessoiresBureau =
    data.accessoiresBureau?.length > 0
      ? data.accessoiresBureau
      : defaultAccessoiresBureau();
  return {
    inventaire,
    accessoiresBureau,
    recensement: data.recensement ?? [],
  };
}

type CoffresViewProps = {
  data: CoffresData | null;
  /** Catégories d’armes du référentiel pour le select Modèle (optgroups). */
  weaponCategories?: WeaponCategoryOption[];
  /** Liste des shérifs (du plus gradé au moins gradé). */
  sheriffs?: SheriffOption[];
};

type FiltreRecensement = "tout" | "coffre" | "pret";

/**
 * Vue Coffres : inventaire, armes bureau, recensement.
 */
export function CoffresView({
  data: initialData,
  weaponCategories = [],
  sheriffs = [],
}: CoffresViewProps) {
  const [state, setState] = useState<CoffresData>(() => buildInitialState(initialData));
  const [activeTab, setActiveTab] = useState<CoffresTabId>("munitions");
  const [filtre, setFiltre] = useState<FiltreRecensement>("tout");
  const [modalRecensement, setModalRecensement] = useState(false);

  useEffect(() => {
    if (initialData != null) {
      setState(buildInitialState(initialData));
    }
  }, [initialData]);

  // Chargement inventaire + accessoires + recensement depuis l’API au montage
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/coffres", { cache: "no-store" }).then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(String(res.status)))
      ),
      fetch("/api/bureau-weapons", { cache: "no-store" }).then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(String(res.status)))
      ),
    ])
      .then(([coffresData, weaponsData]: [
        { inventaire?: InventaireMunition[]; accessoiresBureau?: AccessoireBureau[] },
        Array<{
          id: string;
          model: string;
          serialNumber: string;
          onLoan: boolean;
          inChest: boolean;
          hasScope: boolean;
          comments: string | null;
        }>,
      ]) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          inventaire:
            Array.isArray(coffresData.inventaire) && coffresData.inventaire.length > 0
              ? coffresData.inventaire
              : s.inventaire,
          accessoiresBureau:
            Array.isArray(coffresData.accessoiresBureau) && coffresData.accessoiresBureau.length > 0
              ? coffresData.accessoiresBureau
              : s.accessoiresBureau,
          recensement: Array.isArray(weaponsData)
            ? weaponsData.map((w) => ({
                id: w.id,
                modele: w.model,
                numeroSerie: w.serialNumber,
                pret: !!w.onLoan,
                coffre: !!w.inChest,
                lunette: !!w.hasScope,
                assigne: (w.comments ?? "").trim(),
              }))
            : s.recensement,
        }));
      })
      .catch(() => {
        // Erreur silencieuse ; les valeurs par défaut restent affichées
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { inventaire, accessoiresBureau, recensement } = state;

  const setInventaireQuantite = useCallback((type: string, quantite: number) => {
    setState((s) => ({
      ...s,
      inventaire: s.inventaire.map((r) =>
        r.type === type ? { ...r, quantite: Math.max(0, Math.floor(quantite)) } : r
      ),
    }));
  }, []);

  const setAccessoiresBureauCount = useCallback((type: string, bureau: number) => {
    setState((s) => ({
      ...s,
      accessoiresBureau: s.accessoiresBureau.map((r) =>
        r.type === type ? { ...r, bureau: Math.max(0, Math.floor(bureau)) } : r
      ),
    }));
  }, []);

  /** Persiste une quantité inventaire (munitions) au blur */
  const saveInventaireQuantite = useCallback(async (type: string, quantite: number) => {
    const q = Math.max(0, Math.floor(quantite));
    try {
      const res = await fetch("/api/coffres", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "inventaire", type, quantity: q }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      // Erreur silencieuse ; l’utilisateur peut réessayer en modifiant à nouveau
    }
  }, []);

  /** Persiste une quantité accessoire bureau au blur */
  const saveAccessoireBureau = useCallback(async (type: string, bureau: number) => {
    const b = Math.max(0, Math.floor(bureau));
    try {
      const res = await fetch("/api/coffres", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "accessoiresBureau", type, quantity: b }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      // Erreur silencieuse
    }
  }, []);

  const addRecensement = useCallback(async (row: Omit<ArmeRecensement, "id">): Promise<boolean> => {
    try {
      const res = await fetch("/api/bureau-weapons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: row.modele,
          serialNumber: row.numeroSerie,
          onLoan: row.pret,
          inChest: row.coffre,
          hasScope: row.lunette,
          comments: row.assigne || null,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const created = (await res.json()) as {
        id: string;
        model: string;
        serialNumber: string;
        onLoan: boolean;
        inChest: boolean;
        hasScope: boolean;
        comments: string | null;
      };
      setState((s) => ({
        ...s,
        recensement: [
          ...s.recensement,
          {
            id: created.id,
            modele: created.model,
            numeroSerie: created.serialNumber,
            pret: !!created.onLoan,
            coffre: !!created.inChest,
            lunette: !!created.hasScope,
            assigne: (created.comments ?? "").trim(),
          },
        ],
      }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const updateRecensement = useCallback((id: string, patch: Partial<ArmeRecensement>) => {
    setState((s) => ({
      ...s,
      recensement: s.recensement.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);

  const persistRecensementPatch = useCallback(async (id: string, patch: Partial<ArmeRecensement>) => {
    const payload: Record<string, unknown> = {};
    if (typeof patch.modele === "string") payload.model = patch.modele;
    if (typeof patch.numeroSerie === "string") payload.serialNumber = patch.numeroSerie;
    if (typeof patch.pret === "boolean") payload.onLoan = patch.pret;
    if (typeof patch.coffre === "boolean") payload.inChest = patch.coffre;
    if (typeof patch.lunette === "boolean") payload.hasScope = patch.lunette;
    if (typeof patch.assigne === "string") payload.comments = patch.assigne || null;

    try {
      const res = await fetch(`/api/bureau-weapons/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      // Erreur silencieuse
    }
  }, []);

  const removeRecensement = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/bureau-weapons/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setState((s) => ({
        ...s,
        recensement: s.recensement.filter((r) => r.id !== id),
      }));
    } catch {
      // Erreur silencieuse
    }
  }, []);

  const recensementFiltre = useMemo(() => {
    if (filtre === "tout") return recensement;
    if (filtre === "coffre") return recensement.filter((r) => r.coffre);
    return recensement.filter((r) => r.pret);
  }, [recensement, filtre]);

  const stats = useMemo(() => {
    const enCoffre = recensement.filter((r) => r.coffre).length;
    const pretees = recensement.filter((r) => r.pret).length;
    return { total: recensement.length, enCoffre, pretees };
  }, [recensement]);

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        tabs={[
          { id: "munitions", label: "Stock des munitions", icon: IconMunitions },
          { id: "accessoires", label: "Accessoires et équipement", icon: IconAccessoires },
          { id: "recensement", label: "Recensement armes du bureau", count: stats.total > 0 ? stats.total : null, icon: IconRecensement },
        ]}
        value={activeTab}
        onChange={(id) => setActiveTab(id as CoffresTabId)}
        aria-label="Sections inventaire coffres"
        idPrefix="coffres"
      />

      <div
        role="tabpanel"
        id="coffres-panel-munitions"
        aria-labelledby="coffres-tab-munitions"
        hidden={activeTab !== "munitions"}
        className="pt-4"
      >
        <div className="sheriff-table-scroll overflow-x-auto rounded-lg border border-sheriff-gold/25 bg-sheriff-charcoal/50">
          <table className="w-full min-w-[240px] border-collapse">
            <thead>
              <tr>
                <th className={TABLE_HEAD} scope="col" aria-label="Type" />
                <th className={`${TABLE_HEAD} w-28 text-right`}>Quantité</th>
              </tr>
            </thead>
            <tbody>
              {inventaire.map((row, i) => (
                <tr
                  key={row.type}
                  className={`${i % 2 === 1 ? TABLE_ROW_ALT : ""} border-b border-sheriff-gold/15 last:border-b-0`}
                >
                  <td className={TABLE_CELL}>{row.type}</td>
                  <td className={`${TABLE_CELL} text-right`}>
                    <input
                      type="number"
                      min={0}
                      value={row.quantite}
                      onChange={(e) => setInventaireQuantite(row.type, e.target.valueAsNumber || 0)}
                      onBlur={() => saveInventaireQuantite(row.type, row.quantite)}
                      className={`${SHERIFF_FIELD_DENSE} w-20 text-right`}
                      aria-label={`Quantité ${row.type}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        role="tabpanel"
        id="coffres-panel-accessoires"
        aria-labelledby="coffres-tab-accessoires"
        hidden={activeTab !== "accessoires"}
        className="pt-4"
      >
        <div className="sheriff-table-scroll overflow-x-auto rounded-lg border border-sheriff-gold/25 bg-sheriff-charcoal/50">
          <table className="w-full min-w-[240px] border-collapse">
            <thead>
              <tr>
                <th className={TABLE_HEAD} scope="col" aria-label="Type" />
                <th className={`${TABLE_HEAD} w-28 text-right`}>Quantité au bureau</th>
              </tr>
            </thead>
            <tbody>
              {accessoiresBureau.map((row, i) => (
                <tr
                  key={row.type}
                  className={`${i % 2 === 1 ? TABLE_ROW_ALT : ""} border-b border-sheriff-gold/15 last:border-b-0`}
                >
                  <td className={TABLE_CELL}>{row.type}</td>
                  <td className={`${TABLE_CELL} text-right`}>
                    <input
                      type="number"
                      min={0}
                      value={row.bureau}
                      onChange={(e) => setAccessoiresBureauCount(row.type, e.target.valueAsNumber || 0)}
                      onBlur={() => saveAccessoireBureau(row.type, row.bureau)}
                      className={`${SHERIFF_FIELD_DENSE} w-20 text-right`}
                      aria-label={`Bureau ${row.type}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        role="tabpanel"
        id="coffres-panel-recensement"
        aria-labelledby="coffres-tab-recensement"
        hidden={activeTab !== "recensement"}
        className="pt-4"
      >
        {stats.total > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-sheriff-gold/25 bg-sheriff-charcoal/50 px-4 py-3">
            <span className="text-sm text-sheriff-paper-muted">
              <strong className="text-sheriff-paper">{stats.total}</strong> arme{stats.total !== 1 ? "s" : ""} recensée{stats.total !== 1 ? "s" : ""}
            </span>
            <span className="text-sheriff-gold/50" aria-hidden>·</span>
            <span className="text-sm text-sheriff-paper-muted">
              <strong className="text-sheriff-paper">{stats.enCoffre}</strong> en coffre
            </span>
            <span className="text-sheriff-gold/50" aria-hidden>·</span>
            <span className="text-sm text-sheriff-paper-muted">
              <strong className="text-sheriff-paper">{stats.pretees}</strong> prêtée{stats.pretees !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        <SectionTable
        id="coffres-recensement"
        title="Recensement armes du bureau"
        description="Prêt, coffre, lunette et assignation"
        columns={[
          { key: "modele", label: "Modèle" },
          { key: "serie", label: "N° série" },
          { key: "pret", label: "Prêt", align: "center", headerClassName: "w-20" },
          { key: "coffre", label: "Coffre", align: "center", headerClassName: "w-20" },
          { key: "lunette", label: "Lunette", align: "center", headerClassName: "w-20" },
          { key: "assigne", label: "Assigné à" },
          { key: "actions", label: "", headerClassName: "w-16" },
        ]}
        emptyMessage={
          recensement.length === 0
            ? "Aucune arme recensée. Cliquez sur « Ajouter une arme » pour commencer."
            : "Aucune arme ne correspond au filtre."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModalRecensement(true)}
              className="sheriff-focus-ring sheriff-btn-save inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold"
            >
              Ajouter une arme
            </button>
            {recensement.length > 0 && (
              <>
                <span className="text-xs text-sheriff-paper-muted">Afficher :</span>
                {(["tout", "coffre", "pret"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFiltre(key)}
                    className={`sheriff-focus-ring rounded-full px-3 py-1 text-xs font-medium transition ${
                      filtre === key
                        ? "bg-sheriff-gold/25 text-sheriff-gold border border-sheriff-gold/50"
                        : "border border-sheriff-gold/25 text-sheriff-paper-muted hover:bg-sheriff-gold/10 hover:text-sheriff-paper"
                    }`}
                  >
                    {key === "tout" ? "Tout" : key === "coffre" ? "En coffre" : "Prêtées"}
                  </button>
                ))}
              </>
            )}
          </div>
        }
      >
        {recensementFiltre.map((row, i) => (
          <tr
            key={row.id}
            className={`${i % 2 === 1 ? TABLE_ROW_ALT : ""} border-b border-sheriff-gold/15 last:border-b-0`}
          >
            <td className={TABLE_CELL}>{row.modele}</td>
            <td className={`${TABLE_CELL} font-mono text-xs`}>{row.numeroSerie}</td>
            <td className={`${TABLE_CELL} text-center`}>
              <input
                type="checkbox"
                checked={row.pret}
                onChange={(e) => {
                  const next = e.target.checked;
                  updateRecensement(row.id, { pret: next });
                  void persistRecensementPatch(row.id, { pret: next });
                }}
                className="sheriff-checkbox"
                aria-label="Prêtée"
              />
            </td>
            <td className={`${TABLE_CELL} text-center`}>
              <input
                type="checkbox"
                checked={row.coffre}
                onChange={(e) => {
                  const next = e.target.checked;
                  updateRecensement(row.id, { coffre: next });
                  void persistRecensementPatch(row.id, { coffre: next });
                }}
                className="sheriff-checkbox"
                aria-label="En coffre"
              />
            </td>
            <td className={`${TABLE_CELL} text-center`}>
              <input
                type="checkbox"
                checked={row.lunette}
                onChange={(e) => {
                  const next = e.target.checked;
                  updateRecensement(row.id, { lunette: next });
                  void persistRecensementPatch(row.id, { lunette: next });
                }}
                className="sheriff-checkbox"
                aria-label="Lunette"
              />
            </td>
            <td className={TABLE_CELL}>
              {sheriffs.length > 0 ? (
                <OptionSelect
                  id={`assigne-${row.id}`}
                  value={row.assigne}
                  onChange={(v) => {
                    updateRecensement(row.id, { assigne: v });
                    void persistRecensementPatch(row.id, { assigne: v });
                  }}
                  options={sheriffs.map((s) => ({ value: s.username, label: s.username }))}
                  placeholder="Non assignée"
                  aria-label="Assigné à"
                  variant="dense"
                  className="min-w-0 max-w-[180px]"
                />
              ) : (
                <input
                  type="text"
                  value={row.assigne}
                  onChange={(e) => updateRecensement(row.id, { assigne: e.target.value })}
                  onBlur={(e) => void persistRecensementPatch(row.id, { assigne: e.target.value })}
                  placeholder="Nom"
                  className={`${SHERIFF_FIELD_DENSE} min-w-0 max-w-[140px]`}
                  aria-label="Assigné à"
                />
              )}
            </td>
            <td className={TABLE_CELL}>
              <button
                type="button"
                onClick={() => void removeRecensement(row.id)}
                className="sheriff-focus-ring sheriff-btn-destructive-icon rounded p-1.5"
                aria-label="Supprimer"
                title="Supprimer"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </td>
          </tr>
        ))}
      </SectionTable>
      </div>

      {/* Modal ajout recensement */}
      {modalRecensement && (
        <ModalRecensement
          onClose={() => setModalRecensement(false)}
          onSave={addRecensement}
          weaponCategories={weaponCategories}
          sheriffs={sheriffs}
        />
      )}
    </div>
  );
}

function ModalRecensement({
  onClose,
  onSave,
  weaponCategories = [],
  sheriffs = [],
}: {
  onClose: () => void;
  onSave: (row: Omit<ArmeRecensement, "id">) => boolean | Promise<boolean>;
  weaponCategories?: WeaponCategoryOption[];
  sheriffs?: SheriffOption[];
}) {
  const [modele, setModele] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [pret, setPret] = useState(false);
  const [coffre, setCoffre] = useState(false);
  const [lunette, setLunette] = useState(false);
  const [assigne, setAssigne] = useState(sheriffs[0]?.username ?? "");
  const [submitting, setSubmitting] = useState(false);
  const serieInputRef = useRef<HTMLInputElement>(null);

  const hasWeaponOptions = weaponCategories.length > 0;
  const hasSheriffOptions = sheriffs.length > 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const resetFormForNext = () => {
    setModele("");
    setNumeroSerie("");
    setPret(false);
    setCoffre(false);
    setLunette(false);
    setAssigne(sheriffs[0]?.username ?? "");
    queueMicrotask(() => serieInputRef.current?.focus());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = modele.trim();
    const num = numeroSerie.trim();
    if (!m || !num || submitting) return;
    setSubmitting(true);
    try {
      const ok = await onSave({
        modele: m,
        numeroSerie: num,
        pret,
        coffre,
        lunette,
        assigne: assigne.trim(),
      });
      if (ok) {
        resetFormForNext();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-recensement-title"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 -z-10 cursor-default focus:outline-none"
        aria-label="Fermer"
        tabIndex={-1}
      />
      <div
        className="sheriff-card relative z-0 w-full max-w-md rounded-lg border border-sheriff-gold/30 bg-sheriff-wood p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="modal-recensement-title" className="font-heading flex-1 pr-2 text-lg font-semibold uppercase tracking-wider text-sheriff-gold">
            Nouvelle arme (recensement)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="sheriff-focus-ring -m-1 shrink-0 rounded-md p-1.5 text-sheriff-paper-muted transition hover:bg-sheriff-gold/10 hover:text-sheriff-paper"
            aria-label="Fermer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mb-4 text-xs text-sheriff-paper-muted">
          Après chaque enregistrement réussi, le formulaire se vide pour saisir l&apos;arme suivante. Fermez avec la croix, un clic à l&apos;extérieur ou « Annuler ».
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="rec-modele" className="mb-1 block text-xs font-medium text-sheriff-paper-muted">
              Modèle
            </label>
            {hasWeaponOptions ? (
              <WeaponSelect
                id="rec-modele"
                value={modele}
                onChange={setModele}
                options={weaponCategories}
                aria-label="Modèle de l’arme"
                className="w-full"
              />
            ) : (
              <input
                id="rec-modele"
                type="text"
                required
                value={modele}
                onChange={(e) => setModele(e.target.value)}
                className={SHERIFF_FIELD_COMFORTABLE}
                placeholder="Ex. Evans, Henry"
              />
            )}
          </div>
          <div>
            <label htmlFor="rec-serie" className="mb-1 block text-xs font-medium text-sheriff-paper-muted">N° série</label>
            <input
              ref={serieInputRef}
              id="rec-serie"
              type="text"
              required
              value={numeroSerie}
              onChange={(e) => setNumeroSerie(e.target.value)}
              className={SHERIFF_FIELD_COMFORTABLE}
              placeholder="Ex. 1729815374-6859"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-sheriff-paper-muted">
              <input type="checkbox" checked={pret} onChange={(e) => setPret(e.target.checked)} className="sheriff-checkbox" />
              Prêt
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-sheriff-paper-muted">
              <input type="checkbox" checked={coffre} onChange={(e) => setCoffre(e.target.checked)} className="sheriff-checkbox" />
              Coffre
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-sheriff-paper-muted">
              <input type="checkbox" checked={lunette} onChange={(e) => setLunette(e.target.checked)} className="sheriff-checkbox" />
              Lunette
            </label>
          </div>
          <div>
            <label htmlFor="rec-assigne" className="mb-1 block text-xs font-medium text-sheriff-paper-muted">Assigné à</label>
            {hasSheriffOptions ? (
              <OptionSelect
                id="rec-assigne"
                value={assigne}
                onChange={setAssigne}
                options={sheriffs.map((s) => ({ value: s.username, label: s.username }))}
                placeholder="Choisir un sheriff"
                aria-label="Assigné à"
              />
            ) : (
              <input
                id="rec-assigne"
                type="text"
                value={assigne}
                onChange={(e) => setAssigne(e.target.value)}
                className={SHERIFF_FIELD_COMFORTABLE}
                placeholder="Nom du sheriff"
              />
            )}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="sheriff-focus-ring sheriff-btn-secondary rounded-md px-4 py-2 text-sm font-medium">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="sheriff-focus-ring sheriff-btn-save rounded-md px-4 py-2 text-sm font-semibold disabled:pointer-events-none disabled:opacity-60"
            >
              {submitting ? "Enregistrement…" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
