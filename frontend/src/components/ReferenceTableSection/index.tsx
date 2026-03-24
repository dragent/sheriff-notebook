"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getAllWeaponNames,
  normalizeReferenceData,
  type HomeInfoCategory,
  type ItemCategory,
  type ReferenceData,
  type ReferenceItem,
} from "@/lib/reference";
import { ALL_SHERIFF_GRADES } from "@/lib/grades";
import { Flashbag } from "@/components/feedback/Flashbag";
import { Tabs } from "@/components/ui/Tabs";
import {
  FormattedDate,
  IconClock,
  IconEffectif,
  IconFormations,
  IconHome,
  IconItems,
  IconWeapons,
  WEAPON_TYPES,
} from "./shared";
import { ReferenceWeaponsTab } from "./ReferenceWeaponsTab";
import { ReferenceItemsTab } from "./ReferenceItemsTab";
import { ReferenceAccueilTab } from "./ReferenceAccueilTab";
import { ReferenceFormationsTab } from "./ReferenceFormationsTab";
import { ReferenceDiscordMessageTab } from "./ReferenceEffectifTab";
import { ReferenceWeaponsEditTab } from "./ReferenceWeaponsEditTab";
import { ReferenceItemsEditTab } from "./ReferenceItemsEditTab";
import { ReferenceAccueilEditTab } from "./ReferenceAccueilEditTab";
import { ReferenceFormationsEditTab } from "./ReferenceFormationsEditTab";

export type { ReferenceData, ReferenceItem, ItemCategory, HomeInfoCategory };
export { getAllWeaponNames, normalizeReferenceData };
export type { WeaponKeys } from "./shared";
export { WEAPON_TYPES } from "./shared";

type ViewTabId =
  | "armes"
  | "items"
  | "accueil"
  | "formations"
  | "effectif"
  | "recruitmentMessage";
type EditTabId = "armes" | "items" | "accueil" | "formations";

export function ReferenceTableSection({
  data,
  canEdit,
  updatedAt,
}: {
  data: ReferenceData | Record<string, unknown>;
  canEdit: boolean;
  updatedAt?: string | null;
}) {
  const normalized = useMemo(
    () => normalizeReferenceData(data as Record<string, unknown>),
    [data]
  );
  const updatedAtKey = updatedAt ?? "";
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [viewTab, setViewTab] = useState<ViewTabId>("effectif");
  const [editTab, setEditTab] = useState<EditTabId>("accueil");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReferenceData>(normalized);
  const draftRef = useRef<ReferenceData>(normalized);
  draftRef.current = draft;

  const [openCategoryIds, setOpenCategoryIds] = useState<Set<string>>(
    new Set()
  );
  const [openHomeCategoryIds, setOpenHomeCategoryIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!editing) setDraft(normalized);
  }, [updatedAtKey, editing, normalized]);

  useEffect(() => {
    const firstItemId = normalized.itemCategories[0]?.id;
    const firstHomeId = normalized.homeInfoCategories[0]?.id;
    setOpenCategoryIds((prev) =>
      prev.size > 0 || !firstItemId ? prev : new Set([firstItemId])
    );
    setOpenHomeCategoryIds((prev) =>
      prev.size > 0 || !firstHomeId ? prev : new Set([firstHomeId])
    );
  }, [normalized.itemCategories, normalized.homeInfoCategories]);

  const weaponsCount = WEAPON_TYPES.reduce(
    (acc, t) => acc + (draft[t.key] ?? []).length,
    0
  );
  const itemsCount = draft.itemCategories.reduce(
    (acc, c) => acc + (c.items?.length ?? 0),
    0
  );
  const homeCategoriesCount = draft.homeInfoCategories.length;
  const formationsConfigCount = draft.formations.length;

  const editableFormationGrades = ALL_SHERIFF_GRADES.filter(
    (g) => g !== "Sheriff de comté"
  );
  const formationTableGrades: string[] = [
    ...[...editableFormationGrades].reverse(),
    "Sheriff de comté",
  ];

  function getSerializablePayload(data: ReferenceData): ReferenceData {
    return {
      fusil: (data.fusil ?? []).map((e) => ({
        name: e.name,
        destructionValue: e.destructionValue,
      })),
      carabine: (data.carabine ?? []).map((e) => ({
        name: e.name,
        destructionValue: e.destructionValue,
      })),
      fusilAPompe: (data.fusilAPompe ?? []).map((e) => ({
        name: e.name,
        destructionValue: e.destructionValue,
      })),
      revolver: (data.revolver ?? []).map((e) => ({
        name: e.name,
        destructionValue: e.destructionValue,
      })),
      pistolet: (data.pistolet ?? []).map((e) => ({
        name: e.name,
        destructionValue: e.destructionValue,
      })),
      armeBlanche: (data.armeBlanche ?? []).map((e) => ({
        name: e.name,
        destructionValue: e.destructionValue,
      })),
      itemCategories: (data.itemCategories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        items: (c.items ?? []).map((i) => ({
          name: i.name,
          value: i.value,
          destructionValue: i.destructionValue,
        })),
      })),
      contraventions: (data.contraventions ?? []).map((c) => ({
        label: c.label,
        amende: c.amende,
        prisonTime: c.prisonTime,
      })),
      homeInfoCategories: (data.homeInfoCategories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        order: c.order,
        infos: (c.infos ?? []).map((i) => ({
          id: i.id,
          title: i.title,
          content: i.content,
          order: i.order,
        })),
      })),
      formations: (data.formations ?? []).map((f) => ({
        id: f.id,
        label: f.label,
      })),
      formationsByGrade: (data.formationsByGrade ?? []).map((c) => ({
        grade: c.grade,
        formationIds: [...(c.formationIds ?? [])],
      })),
    };
  }

  async function handleSave(
    payload?: ReferenceData,
    options?: { keepEditing?: boolean }
  ) {
    if (!canEdit) {
      setError("Seuls le Sheriff de comté et l'Adjoint peuvent enregistrer.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const toSend = payload ?? draftRef.current;
      const bodyStr = JSON.stringify(getSerializablePayload(toSend));
      const res = await fetch("/api/reference", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: bodyStr,
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (body?.error as string) || res.statusText || "Erreur lors de l'enregistrement";
        const detail =
          typeof body?.detail === "string" ? body.detail : undefined;
        setError(detail ? `${msg} — ${detail}` : msg);
        return;
      }
      if (!options?.keepEditing) setEditing(false);
      setSavedMessage(true);
      if (body?.data && typeof body.data === "object") {
        setDraft(normalizeReferenceData(body.data as Record<string, unknown>));
      }
      router.refresh();
      setTimeout(() => setSavedMessage(false), 4000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur inattendue";
      setError(`Enregistrement impossible — ${message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(normalized);
    setEditing(false);
    setError(null);
  }

  return (
    <div className="space-y-8">
      {error && <Flashbag variant="error">{error}</Flashbag>}
      {savedMessage && (
        <Flashbag variant="success">
          Référentiel enregistré avec succès.
        </Flashbag>
      )}

      {!editing ? (
        <>
          <Tabs
            tabs={[
              {
                id: "effectif",
                label: "Effectifs",
                count: null,
                icon: IconEffectif,
              },
              {
                id: "recruitmentMessage",
                label: "Message de recrutement",
                count: null,
                icon: IconEffectif,
              },
              {
                id: "accueil",
                label: "Informations d'accueil",
                count: homeCategoriesCount,
                icon: IconHome,
              },
              {
                id: "formations",
                label: "Formations",
                count: formationsConfigCount,
                icon: IconFormations,
              },
              {
                id: "items",
                label: "Items",
                count: itemsCount,
                icon: IconItems,
              },
              {
                id: "armes",
                label: "Armes",
                count: weaponsCount,
                icon: IconWeapons,
              },
            ]}
            value={viewTab}
            onChange={(id) => setViewTab(id as ViewTabId)}
            aria-label="Sections de la table de référence"
            idPrefix="view"
          />

          <div
            role="tabpanel"
            id="view-panel-armes"
            aria-labelledby="view-tab-armes"
            hidden={viewTab !== "armes"}
            className="pt-4"
          >
            <ReferenceWeaponsTab
              weapons={{
                fusil: draft.fusil,
                carabine: draft.carabine,
                fusilAPompe: draft.fusilAPompe,
                revolver: draft.revolver,
                pistolet: draft.pistolet,
                armeBlanche: draft.armeBlanche,
              }}
            />
          </div>
          <div
            role="tabpanel"
            id="view-panel-items"
            aria-labelledby="view-tab-items"
            hidden={viewTab !== "items"}
            className="pt-4 space-y-3"
          >
            <ReferenceItemsTab
              itemCategories={draft.itemCategories}
              openCategoryIds={openCategoryIds}
              setOpenCategoryIds={setOpenCategoryIds}
            />
          </div>
          <div
            role="tabpanel"
            id="view-panel-accueil"
            aria-labelledby="view-tab-accueil"
            hidden={viewTab !== "accueil"}
            className="pt-4 space-y-3"
          >
            <ReferenceAccueilTab
              homeInfoCategories={draft.homeInfoCategories}
              openHomeCategoryIds={openHomeCategoryIds}
              setOpenHomeCategoryIds={setOpenHomeCategoryIds}
            />
          </div>
          <div
            role="tabpanel"
            id="view-panel-formations"
            aria-labelledby="view-tab-formations"
            hidden={viewTab !== "formations"}
            className="pt-4 space-y-3"
          >
            <ReferenceFormationsTab
              formations={draft.formations}
              formationsByGrade={draft.formationsByGrade ?? []}
              formationTableGrades={formationTableGrades}
            />
          </div>
          <div
            role="tabpanel"
            id="view-panel-effectif"
            aria-labelledby="view-tab-effectif"
            hidden={viewTab !== "effectif"}
            className="pt-4"
          >
            <ReferenceDiscordMessageTab variant="effectif" />
          </div>
          <div
            role="tabpanel"
            id="view-panel-recruitmentMessage"
            aria-labelledby="view-tab-recruitmentMessage"
            hidden={viewTab !== "recruitmentMessage"}
            className="pt-4"
          >
            <ReferenceDiscordMessageTab variant="recruitment" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-sheriff-gold/20 pt-6">
            {updatedAt && (
              <p className="flex items-center gap-2 text-xs text-sheriff-paper-muted/80">
                <IconClock className="h-4 w-4 shrink-0" />
                <span>
                  Dernière mise à jour :{" "}
                  <FormattedDate isoDate={updatedAt} />
                </span>
              </p>
            )}
            {canEdit ? (
              <button
                type="button"
                onClick={() => {
                  setDraft(normalized);
                  setEditing(true);
                }}
                className="sheriff-focus-ring sheriff-btn-save-soft order-last inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold"
              >
                Modifier les informations
              </button>
            ) : (
              <p className="order-last text-xs text-sheriff-paper-muted/90">
                Modification réservée au Sheriff de comté et à l&apos;Adjoint.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-sheriff-paper-muted">
            Saisissez directement dans les champs. Utilisez « Ajouter une ligne »
            ou « Ajouter » pour créer des entrées.
          </p>

          <Tabs
            tabs={[
              {
                id: "accueil",
                label: "Informations d'accueil",
                count: homeCategoriesCount,
                icon: IconHome,
              },
              {
                id: "formations",
                label: "Formations",
                count: formationsConfigCount,
                icon: IconFormations,
              },
              {
                id: "items",
                label: "Items",
                count: itemsCount,
                icon: IconItems,
              },
              {
                id: "armes",
                label: "Armes",
                count: weaponsCount,
                icon: IconWeapons,
              },
            ]}
            value={editTab}
            onChange={(id) => setEditTab(id as EditTabId)}
            aria-label="Sections à modifier"
            idPrefix="edit"
          />

          <div
            role="tabpanel"
            id="edit-panel-armes"
            aria-labelledby="edit-tab-armes"
            hidden={editTab !== "armes"}
          >
            <ReferenceWeaponsEditTab draft={draft} setDraft={setDraft} />
          </div>
          <div
            role="tabpanel"
            id="edit-panel-items"
            aria-labelledby="edit-tab-items"
            hidden={editTab !== "items"}
          >
            <ReferenceItemsEditTab
              draft={draft}
              setDraft={setDraft}
              openCategoryIds={openCategoryIds}
              setOpenCategoryIds={setOpenCategoryIds}
            />
          </div>
          <div
            role="tabpanel"
            id="edit-panel-accueil"
            aria-labelledby="edit-tab-accueil"
            hidden={editTab !== "accueil"}
          >
            <ReferenceAccueilEditTab
              draft={draft}
              setDraft={setDraft}
              openHomeCategoryIds={openHomeCategoryIds}
              setOpenHomeCategoryIds={setOpenHomeCategoryIds}
            />
          </div>
          <div
            role="tabpanel"
            id="edit-panel-formations"
            aria-labelledby="edit-tab-formations"
            hidden={editTab !== "formations"}
          >
            <ReferenceFormationsEditTab
              draft={draft}
              setDraft={setDraft}
              formationTableGrades={formationTableGrades}
              onSave={handleSave}
              draftRef={draftRef}
            />
          </div>

          <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-t border-sheriff-gold/30 bg-sheriff-wood/95 px-4 py-4 shadow-[0_-4px_14px_rgba(0,0,0,0.2)] backdrop-blur-sm sm:rounded-b-lg">
            <button
              type="button"
              onClick={() => setTimeout(() => handleSave(), 0)}
              disabled={saving}
              className="sheriff-focus-ring sheriff-btn-save inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold disabled:opacity-70"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="sheriff-focus-ring sheriff-btn-secondary inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-70"
            >
              Annuler
            </button>
          </div>
        </>
      )}
    </div>
  );
}
