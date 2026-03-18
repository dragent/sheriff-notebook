"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { ProfilForm, type ProfilRecord } from "./ProfilForm";
import { ProfilFormations } from "./ProfilFormations";
import type { WeaponCategoryOption } from "@/lib/reference";

export type ProfilSectionsProps = {
  record: ProfilRecord;
  weaponOptionsByCategory: WeaponCategoryOption[];
  backendBaseUrl: string;
  token: string;
  allowedFormations: { id: string; label: string }[];
  formationValidations: Record<string, boolean>;
};

type ProfilTabId = "informations-personnelles" | "formations";

/**
 * Bloc onglets Profil (Informations personnelles / Formations), même composant Tabs que l'accueil.
 */
export function ProfilSections({
  record,
  weaponOptionsByCategory,
  backendBaseUrl,
  token,
  allowedFormations,
  formationValidations,
}: ProfilSectionsProps) {
  const [activeTab, setActiveTab] = useState<ProfilTabId>("informations-personnelles");

  return (
    <div className="flex w-full flex-col gap-6">
      <Tabs
        tabs={[
          { id: "informations-personnelles", label: "Informations personnelles" },
          { id: "formations", label: "Formations" },
        ]}
        value={activeTab}
        onChange={(id) => setActiveTab(id as ProfilTabId)}
        aria-label="Onglets du profil"
        idPrefix="profil"
      />

      {activeTab === "informations-personnelles" && (
        <div
          role="tabpanel"
          id="profil-panel-informations-personnelles"
          aria-labelledby="profil-tab-informations-personnelles"
          aria-label="Informations personnelles"
          className="sheriff-card w-full overflow-hidden rounded-lg border border-sheriff-gold/40 bg-sheriff-wood shadow-md"
        >
          <div className="border-b border-sheriff-gold/40 bg-sheriff-charcoal/80 px-4 py-4">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-sheriff-gold">
              Informations personnelles
            </h2>
            <p className="mt-1.5 text-xs text-sheriff-paper-muted/90">
              Télégramme, armement, calèche, bateau
            </p>
          </div>
          <div className="p-4">
            <ProfilForm
              record={record}
              weaponOptionsByCategory={weaponOptionsByCategory}
              backendBaseUrl={backendBaseUrl}
              token={token}
            />
          </div>
        </div>
      )}

      {activeTab === "formations" && (
        <div
          role="tabpanel"
          id="profil-panel-formations"
          aria-labelledby="profil-tab-formations"
          aria-label="Formations"
          className="sheriff-card w-full overflow-hidden rounded-lg border border-sheriff-gold/40 bg-sheriff-wood shadow-md"
        >
          <div className="border-b border-sheriff-gold/40 bg-sheriff-charcoal/80 px-4 py-4">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-sheriff-gold">
              Formations
            </h2>
            <p className="mt-1.5 text-xs text-sheriff-paper-muted/90">
              À apprendre et validées à votre grade
            </p>
          </div>
          <div className="p-4">
            <ProfilFormations
              allowedFormations={allowedFormations}
              formationValidations={formationValidations}
            />
          </div>
        </div>
      )}
    </div>
  );
}
