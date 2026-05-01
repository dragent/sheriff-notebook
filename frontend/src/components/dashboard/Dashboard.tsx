"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Flashbag } from "@/components/feedback/Flashbag";
import { normalizeUuidString } from "@/lib/uuidNormalize";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { DashboardPlanningTab } from "@/components/dashboard/DashboardPlanningTab";
import { DashboardWeaponsTab } from "@/components/dashboard/DashboardWeaponsTab";
import { DashboardFormationsTab } from "@/components/dashboard/DashboardFormationsTab";
import type {
  BureauRow,
  SheriffRef,
} from "@/components/dashboard/dashboardShared";

export type ServiceRecordFull = {
  id: string;
  /** Linked user id (same as sheriff id in /api/sheriffs) when the fiche is attached to a user. */
  userId?: string | null;
  name: string;
  /** Grade du joueur (table user), exposé par l'API services. */
  grade: string | null;
  telegramPrimary: string | null;
  total: number | null;
  monDay: boolean;
  monNight: boolean;
  tueDay: boolean;
  tueNight: boolean;
  wedDay: boolean;
  wedNight: boolean;
  thuDay: boolean;
  thuNight: boolean;
  friDay: boolean;
  friNight: boolean;
  satDay: boolean;
  satNight: boolean;
  sunDay: boolean;
  sunNight: boolean;
  primaryWeapon: string | null;
  primaryWeaponSerial: string | null;
  primaryHasScope: boolean;
  hasScope: boolean;
  secondaryWeapon: string | null;
  secondaryWeaponSerial: string | null;
  secondaryHasScope: boolean;
  thirdWeapon: string | null;
  thirdWeaponSerial: string | null;
  thirdHasScope: boolean;
  tranquilizerWeapon: string | null;
  tranquilizerWeaponSerial: string | null;
  tranquilizerHasScope: boolean;
  cartInfo: string | null;
  boatInfo: string | null;
  /** Validations par id de formation (catalogue référentiel). */
  formationValidations: Record<string, boolean>;
};

type DashboardTab = "planning" | "weapons" | "formations";

type Props = {
  records: ServiceRecordFull[];
  allowedFormations: { id: string; label: string }[];
  allFormations?: { id: string; label: string }[];
  sheriffs: SheriffRef[];
  currentUsername?: string | null;
  currentGrade?: string | null;
};

/**
 * Tableau de bord — orchestrateur léger : compose la liste des shérifs avec
 * leurs fiches de service, branche les actions HR/planning via
 * {@link useDashboardActions}, et affiche l'onglet sélectionné.
 */
export function Dashboard({
  records,
  allowedFormations,
  allFormations,
  sheriffs,
  currentUsername,
  currentGrade,
}: Props) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("planning");
  const displayFormations = allFormations?.length ? allFormations : allowedFormations;

  const actions = useDashboardActions({ currentGrade });

  /** Match fiche ↔ sheriff: prefer stable Symfony user UUID, then exact name, then case-insensitive name. */
  const recordsByUserId = new Map<string, ServiceRecordFull>();
  for (const r of records) {
    const uid = normalizeUuidString(r.userId);
    if (uid) recordsByUserId.set(uid, r);
  }
  const recordsByName = new Map(records.map((r) => [r.name, r]));
  const recordForSheriff = (sheriff: SheriffRef): ServiceRecordFull | null => {
    const sheriffUid = normalizeUuidString(sheriff.id);
    if (sheriffUid) {
      const byId = recordsByUserId.get(sheriffUid);
      if (byId) return byId;
    }
    const byExact = recordsByName.get(sheriff.username);
    if (byExact) return byExact;
    return (
      records.find(
        (r) =>
          r.name.localeCompare(sheriff.username, undefined, {
            sensitivity: "base",
          }) === 0,
      ) ?? null
    );
  };
  const bureauRows: BureauRow[] = sheriffs.map((sheriff) => ({
    sheriff,
    record: recordForSheriff(sheriff),
  }));

  return (
    <div className="flex w-full flex-col gap-8">
      <p className="max-w-2xl text-sm text-sheriff-paper-muted">
        Ce tableau de bord rassemble la liste du bureau, le planning de service et les formations.
        Utilisez les onglets ci-dessous pour naviguer facilement entre Planning / Paie, Armes &amp; véhicules et Formations.
      </p>

      {actions.patchError && (
        <Flashbag key={actions.patchError} variant="error">
          {actions.patchError}
        </Flashbag>
      )}

      <Tabs
        tabs={[
          { id: "planning", label: "Planning / Paie" },
          { id: "weapons", label: "Armes & véhicules" },
          { id: "formations", label: "Formations" },
        ]}
        value={activeTab}
        onChange={(id) => setActiveTab(id as DashboardTab)}
        aria-label="Onglets du tableau de bord"
      />

      {activeTab === "planning" && (
        <DashboardPlanningTab
          bureauRows={bureauRows}
          sheriffsCount={sheriffs.length}
          currentGrade={currentGrade}
          currentUsername={currentUsername}
          updating={actions.updating}
          deletingId={actions.deletingId}
          promotingId={actions.promotingId}
          cleaningPlanning={actions.cleaningPlanning}
          onPatchRecord={actions.patchRecord}
          onPromoteSheriff={actions.promoteSheriff}
          onDeleteSheriff={actions.deleteSheriff}
          onClearPlanning={actions.clearPlanningTable}
        />
      )}

      {activeTab === "weapons" && (
        <DashboardWeaponsTab bureauRows={bureauRows} sheriffsCount={sheriffs.length} />
      )}

      {activeTab === "formations" && (
        <DashboardFormationsTab
          bureauRows={bureauRows}
          sheriffsCount={sheriffs.length}
          displayFormations={displayFormations}
          currentGrade={currentGrade}
          currentUsername={currentUsername}
          updating={actions.updating}
          onPatchRecord={actions.patchRecord}
        />
      )}
    </div>
  );
}
