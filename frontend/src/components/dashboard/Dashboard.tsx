"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANNING_COLUMNS } from "@/lib/formations";
import { EmptyTableState } from "@/components/ui/EmptyTableState";
import { SectionTable } from "@/components/ui/SectionTable";
import { Tabs } from "@/components/ui/Tabs";
import { Flashbag } from "@/components/feedback/Flashbag";
import {
  ALL_SHERIFF_GRADES,
  COMTE_ADJOINT_GRADES,
  GRADE_ORDER,
  resolveRowGrade,
} from "@/lib/grades";

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
  hasScope: boolean;
  secondaryWeapon: string | null;
  secondaryWeaponSerial: string | null;
  cartInfo: string | null;
  boatInfo: string | null;
  /** Validations par id de formation (catalogue référentiel). */
  formationValidations: Record<string, boolean>;
};

type SheriffRef = {
  id: string;
  username: string;
  grade: string;
  recruitedAt: string | null;
};

function _gradeIcon(grade: string | undefined): string {
  if (!grade) return "—";
  if (grade === "Shérif") return "★";
  if (grade === "Sheriff adjoint") return "◆";
  if (grade === "Comté") return "•";
  if (grade === "Deputy") return "▸";
  return "—";
}

function formatCartAndBoat(cartInfo: string | null, boatInfo: string | null): string {
  const cart = cartInfo?.trim()
    ? cartInfo.split("\n").map((s) => s.trim()).filter(Boolean).join(", ")
    : "";
  const boat = boatInfo?.trim()
    ? boatInfo.split("\n").map((s) => s.trim()).filter(Boolean).join(", ")
    : "";
  if (cart && boat) return `${cart} — Bateau: ${boat}`;
  if (cart) return cart;
  if (boat) return boat;
  return "—";
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 1a3.5 3.5 0 0 1 3.5 3.5v2h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h1v-2A3.5 3.5 0 0 1 8 1zm2 5.5v-2a2 2 0 1 0-4 0v2h4z" />
    </svg>
  );
}

/**
 * Tableau de bord : présences service et formations par sheriff.
 */
export function Dashboard({
  records,
  allowedFormations,
  allFormations,
  sheriffs,
  currentUsername,
  currentGrade,
}: {
  records: ServiceRecordFull[];
  allowedFormations: { id: string; label: string }[];
  allFormations?: { id: string; label: string }[];
  sheriffs: SheriffRef[];
  currentUsername?: string | null;
  currentGrade?: string | null;
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  type DashboardTab = "planning" | "weapons" | "formations";
  const [activeTab, setActiveTab] = useState<DashboardTab>("planning");
  const displayFormations = allFormations?.length ? allFormations : allowedFormations;

  /** Match fiche ↔ sheriff: prefer stable user UUID, then exact name, then case-insensitive name (CSV import vs Discord). */
  const recordsByUserId = new Map(
    records.filter((r) => r.userId).map((r) => [r.userId as string, r])
  );
  const recordsByName = new Map(records.map((r) => [r.name, r]));
  function recordForSheriff(sheriff: SheriffRef): ServiceRecordFull | null {
    const byId = recordsByUserId.get(sheriff.id);
    if (byId) return byId;
    const byExact = recordsByName.get(sheriff.username);
    if (byExact) return byExact;
    return (
      records.find(
        (r) =>
          r.name.localeCompare(sheriff.username, undefined, {
            sensitivity: "base",
          }) === 0
      ) ?? null
    );
  }
  const bureauRows = sheriffs.map((sheriff) => ({
    sheriff,
    record: recordForSheriff(sheriff),
  }));

  function isOwnRecord(recordName: string): boolean {
    if (currentUsername == null) return false;
    return recordName.localeCompare(currentUsername, undefined, {
      sensitivity: "base",
    }) === 0;
  }

  function canEditRecord(recordName: string): boolean {
    return isOwnRecord(recordName);
  }

  function canDeleteSheriffRow(
    sheriffGrade: string | null,
    sheriffUsername: string
  ): boolean {
    if (!currentGrade || !COMTE_ADJOINT_GRADES.has(currentGrade)) return false;
    if (!sheriffGrade) return false;
    if (!currentUsername) return false;
    if (sheriffUsername.localeCompare(currentUsername, undefined, { sensitivity: "base" }) === 0) {
      return false;
    }
    const actorOrder = GRADE_ORDER[currentGrade] ?? null;
    const targetOrder = GRADE_ORDER[sheriffGrade] ?? null;
    if (actorOrder === null || targetOrder === null) return false;
    if (actorOrder === 0) return true;
    return actorOrder < targetOrder;
  }

  function getNextPromotionGrade(targetGrade: string | null): string | null {
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

  function getNextDemotionGrade(targetGrade: string | null): string | null {
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

  async function patchRecord(
    id: string,
    payload: Partial<ServiceRecordFull>
  ): Promise<void> {
    setPatchError(null);
    setUpdating(id);
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      const message = (body?.error as string) || res.statusText;
      if (res.status === 403) {
        const err = (body?.error as string) || "";
        if (err.includes("formation")) {
          setPatchError(
            "Vous ne pouvez valider les formations que pour les grades inférieurs si vous êtes Sheriff de comté, Adjoint ou En chef."
          );
        } else {
          setPatchError("Vous ne pouvez modifier que votre propre fiche de service.");
        }
      } else if (res.status === 401) {
        setPatchError("Session expirée. Reconnectez-vous.");
      } else {
        setPatchError(`Erreur ${res.status}: ${message}`);
      }
    } catch {
      setPatchError(
        "Erreur réseau. Vérifiez que le backend est démarré (ex. http://localhost:8080) et que BACKEND_BASE_URL est correct."
      );
    } finally {
      setUpdating(null);
    }
  }

  async function deleteSheriff(userId: string): Promise<void> {
    setPatchError(null);
    setDeletingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ grade: null }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      const message = (body?.error as string) || res.statusText;
      if (res.status === 403) {
        setPatchError("Vous ne pouvez supprimer que les shérifs de grade inférieur (Sheriff adjoint ou comté requis).");
      } else if (res.status === 401) {
        setPatchError("Session expirée. Reconnectez-vous.");
      } else {
        setPatchError(`Erreur ${res.status}: ${message}`);
      }
    } catch {
      setPatchError(
        "Erreur réseau. Vérifiez que le backend est démarré (ex. http://localhost:8080) et que BACKEND_BASE_URL est correct."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function promoteSheriff(userId: string, newGrade: string): Promise<void> {
    setPatchError(null);
    setPromotingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ grade: newGrade }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        router.refresh();
        return;
      }
      const message = (body?.error as string) || res.statusText;
      if (res.status === 403) {
        setPatchError(
          "Promotion non autorisée : seuls un Sheriff de comté ou un Sheriff adjoint peuvent promouvoir les grades inférieurs."
        );
      } else if (res.status === 401) {
        setPatchError("Session expirée. Reconnectez-vous.");
      } else {
        setPatchError(`Erreur ${res.status}: ${message}`);
      }
    } catch {
      setPatchError(
        "Erreur réseau. Vérifiez que le backend est démarré (ex. http://localhost:8080) et que BACKEND_BASE_URL est correct."
      );
    } finally {
      setPromotingId(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <p className="max-w-2xl text-sm text-sheriff-paper-muted">
        Ce tableau de bord rassemble la liste du bureau, le planning de service et les formations.
        Utilisez les onglets ci-dessous pour naviguer facilement entre Planning / Paie, Armes &amp; véhicules et Formations.
      </p>

      {patchError && (
        <Flashbag key={patchError} variant="error">
          {patchError}
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
        <div
          className="sheriff-card w-full overflow-hidden rounded-lg border-sheriff-gold/40 bg-sheriff-wood shadow-md"
          role="tabpanel"
          aria-label="Planning et paie du bureau"
        >
          <div className="border-b border-sheriff-gold/40 bg-sheriff-charcoal/80 px-4 py-4">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-sheriff-gold">
              Planning &amp; paie — {sheriffs.length} / 15 shérifs
            </h2>
            <p className="mt-1.5 text-xs text-sheriff-paper-muted/90">
              NOM · Télégramme · Grade · Recrutement · Présences jour/soir · Actions RH.
            </p>
          </div>
          <div className="sheriff-table-scroll overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-sheriff-gold/30 bg-sheriff-charcoal/95 text-xs uppercase tracking-wide text-sheriff-gold/90 shadow-[0_1px_0_0_var(--sheriff-gold)]">
                  <th className="sticky left-0 z-10 whitespace-nowrap px-2 py-2 font-heading bg-sheriff-charcoal/95 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.25)]">
                    NOM
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 font-heading">Télégramme</th>
                  <th className="whitespace-nowrap px-2 py-2 text-center font-heading">Grade</th>
                  <th className="whitespace-nowrap px-2 py-2 font-heading">Recrutement</th>
                  {PLANNING_COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className="whitespace-nowrap px-1 py-2 text-center font-heading"
                      title={c.label}
                    >
                      {c.label.replace(/ \(J\)| \(S\)/, "")}
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-2 py-2 text-center font-heading">Promotion</th>
                  <th className="whitespace-nowrap px-2 py-2 text-center font-heading">Rétrogradation</th>
                  <th className="whitespace-nowrap px-2 py-2 text-center font-heading">Licenciement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sheriff-gold/20">
                {bureauRows.map(({ sheriff, record: r }) =>
                  r ? (
                    <tr key={r.id} className="group transition hover:bg-sheriff-gold/5">
                      <td className="sticky left-0 z-1 w-36 shrink-0 whitespace-nowrap bg-sheriff-wood px-2 py-2 font-medium text-sheriff-paper shadow-[2px_0_6px_-2px_rgba(0,0,0,0.25)] group-hover:bg-sheriff-gold/5">
                        {r.name}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-sheriff-paper-muted">{r.telegramPrimary ?? "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-center text-sheriff-gold">
                        {resolveRowGrade(r.grade, sheriff.grade) ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper-muted">
                        {sheriff.recruitedAt
                          ? new Date(sheriff.recruitedAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              timeZone: "Europe/Paris",
                            })
                          : "—"}
                      </td>
                      {PLANNING_COLUMNS.map((col) => {
                        const editable = canEditRecord(r.name);
                        return (
                          <td key={col.key} className="px-1 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={(r as Record<string, unknown>)[col.key] as boolean}
                              disabled={updating === r.id || !editable}
                              readOnly={!editable}
                              onChange={() =>
                                editable &&
                                patchRecord(r.id, {
                                  [col.key]: !(r as Record<string, unknown>)[col.key],
                                })
                              }
                              className="sheriff-checkbox inline-block align-middle"
                              title={editable ? undefined : "Modification réservée à votre propre fiche"}
                              aria-label={col.label}
                            />
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap px-2 py-2 text-center">
                        {(() => {
                          const targetGrade = resolveRowGrade(r.grade, sheriff.grade);
                          const nextGrade = getNextPromotionGrade(targetGrade);
                          if (!nextGrade) {
                            return <span className="text-sheriff-paper-muted text-xs">—</span>;
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => promoteSheriff(sheriff.id, nextGrade)}
                              disabled={promotingId === sheriff.id}
                              className="sheriff-focus-ring inline-flex w-full items-center justify-center rounded bg-sheriff-gold/20 px-2 py-1 text-xs font-semibold text-sheriff-gold hover:bg-sheriff-gold/30 disabled:opacity-50"
                              title={`Promouvoir en ${nextGrade}`}
                            >
                              {promotingId === sheriff.id ? "…" : "Promouvoir"}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-center">
                        {(() => {
                          const targetGrade = resolveRowGrade(r.grade, sheriff.grade);
                          const previousGrade = getNextDemotionGrade(targetGrade);
                          if (!previousGrade || !currentGrade) {
                            return <span className="text-sheriff-paper-muted text-xs">—</span>;
                          }
                          const actorOrder = GRADE_ORDER[currentGrade] ?? null;
                          const targetOrder = targetGrade ? GRADE_ORDER[targetGrade] ?? null : null;
                          if (
                            actorOrder === null ||
                            targetOrder === null ||
                            actorOrder > 2 ||
                            actorOrder >= targetOrder
                          ) {
                            return <span className="text-sheriff-paper-muted text-xs">—</span>;
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => promoteSheriff(sheriff.id, previousGrade)}
                              disabled={promotingId === sheriff.id}
                              className="sheriff-focus-ring inline-flex w-full items-center justify-center rounded bg-sheriff-charcoal/60 px-2 py-1 text-xs font-semibold text-sheriff-paper hover:bg-sheriff-charcoal/80 disabled:opacity-50"
                              title={`Rétrograder en ${previousGrade}`}
                            >
                              {promotingId === sheriff.id ? "…" : "Rétrograder"}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-center">
                        {canDeleteSheriffRow(resolveRowGrade(r.grade, sheriff.grade), sheriff.username) &&
                          (() => {
                            const targetGrade = resolveRowGrade(r.grade, sheriff.grade);
                            const isComte = targetGrade === "Sheriff de comté";
                            const label = isComte ? "Remercier" : "Licencier";
                            return (
                              <button
                                type="button"
                                onClick={() => deleteSheriff(sheriff.id)}
                                disabled={deletingId === sheriff.id}
                                className="sheriff-focus-ring sheriff-btn-destructive inline-flex w-full items-center justify-center rounded px-2 py-1 text-xs font-semibold disabled:opacity-50"
                              >
                                {deletingId === sheriff.id ? "…" : label}
                              </button>
                            );
                          })()}
                      </td>
                    </tr>
                  ) : (
                    <tr key={`sheriff-${sheriff.username}`} className="group transition hover:bg-sheriff-gold/5">
                      <td className="sticky left-0 z-1 w-36 shrink-0 whitespace-nowrap bg-sheriff-wood px-2 py-2 font-medium text-sheriff-paper shadow-[2px_0_6px_-2px_rgba(0,0,0,0.25)] group-hover:bg-sheriff-gold/5">
                        {sheriff.username}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-sheriff-paper-muted">—</td>
                      <td className="whitespace-nowrap px-2 py-2 text-center text-sheriff-gold">{sheriff.grade}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper-muted">
                        {sheriff.recruitedAt
                          ? new Date(sheriff.recruitedAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              timeZone: "Europe/Paris",
                            })
                          : "—"}
                      </td>
                      {PLANNING_COLUMNS.map((col) => (
                        <td key={col.key} className="px-1 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={false}
                            disabled
                            readOnly
                            aria-label={`${col.label} (fiche service non créée)`}
                            className="sheriff-checkbox sheriff-checkbox--disabled-only inline-block align-middle"
                          />
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-2 py-2 text-sheriff-paper-muted">—</td>
                      <td className="whitespace-nowrap px-2 py-2 text-center text-sheriff-paper-muted">—</td>
                      <td className="whitespace-nowrap px-2 py-2 text-center text-sheriff-paper-muted">—</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
            {sheriffs.length > 0 && (
              <div className="mt-2 px-2 pb-3 text-xs text-sheriff-paper-muted sm:hidden">
                Glissez horizontalement pour voir tout le planning et les actions RH.
              </div>
            )}
            <p className="mt-1 px-2 pb-3 text-[11px] text-sheriff-paper-muted/80">
              Promotion, rétrogradation et licenciement sont réservés aux grades Sheriff de comté / Adjoint,
              en fonction de la hiérarchie des grades.
            </p>
            {sheriffs.length === 0 && (
              <EmptyTableState
                message="Aucun shérif."
                subtitle="La liste apparaîtra ici une fois les shérifs enregistrés."
              />
            )}
          </div>
        </div>
      )}

      {activeTab === "weapons" && (
        <div
          className="sheriff-card w-full overflow-hidden rounded-lg border-sheriff-gold/40 bg-sheriff-wood shadow-md"
          role="tabpanel"
          aria-label="Armes et véhicules du bureau"
        >
          <div className="border-b border-sheriff-gold/40 bg-sheriff-charcoal/80 px-4 py-4">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-sheriff-gold">
              Armes &amp; véhicules — {sheriffs.length} shérifs
            </h2>
            <p className="mt-1.5 text-xs text-sheriff-paper-muted/90">
              Armes principales et secondaires, numéros de série, lunette, calèches et bateaux.
            </p>
          </div>
          <div className="sheriff-table-scroll overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-sheriff-gold/30 bg-sheriff-charcoal/95 text-xs uppercase tracking-wide text-sheriff-gold/90 shadow-[0_1px_0_0_var(--sheriff-gold)]">
                  <th className="sticky left-0 z-10 whitespace-nowrap px-2 py-2 font-heading bg-sheriff-charcoal/95 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.25)]">
                    NOM
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 font-heading">Télégramme</th>
                  <th className="whitespace-nowrap px-2 py-2 text-center font-heading">Grade</th>
                  <th className="whitespace-nowrap px-2 py-2 font-heading">Arme princ.</th>
                  <th className="whitespace-nowrap px-2 py-2 font-heading">N° série</th>
                  <th className="whitespace-nowrap px-2 py-2 text-center font-heading">Lunette</th>
                  <th className="whitespace-nowrap px-2 py-2 font-heading">Arme sec.</th>
                  <th className="whitespace-nowrap px-2 py-2 text-center font-heading">Calèche / Bateau</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sheriff-gold/20">
                {bureauRows.map(({ sheriff, record: r }) =>
                  r ? (
                    <tr key={r.id} className="group transition hover:bg-sheriff-gold/5">
                      <td className="sticky left-0 z-1 w-36 shrink-0 whitespace-nowrap bg-sheriff-wood px-2 py-2 font-medium text-sheriff-paper shadow-[2px_0_6px_-2px_rgba(0,0,0,0.25)] group-hover:bg-sheriff-gold/5">
                        {r.name}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-sheriff-paper-muted">{r.telegramPrimary ?? "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-center text-sheriff-gold">
                        {resolveRowGrade(r.grade, sheriff.grade) ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper">{r.primaryWeapon ?? "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper">{r.primaryWeaponSerial ?? "—"}</td>
                      <td className="px-2 py-2 text-center text-sheriff-paper">{r.hasScope ? "Oui" : "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper">{r.secondaryWeapon ?? "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper">{formatCartAndBoat(r.cartInfo, r.boatInfo)}</td>
                    </tr>
                  ) : (
                    <tr key={`sheriff-${sheriff.username}`} className="group transition hover:bg-sheriff-gold/5">
                      <td className="sticky left-0 z-1 w-36 shrink-0 whitespace-nowrap bg-sheriff-wood px-2 py-2 font-medium text-sheriff-paper shadow-[2px_0_6px_-2px_rgba(0,0,0,0.25)] group-hover:bg-sheriff-gold/5">
                        {sheriff.username}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-sheriff-paper-muted">—</td>
                      <td className="whitespace-nowrap px-2 py-2 text-center text-sheriff-gold">{sheriff.grade}</td>
                      <td colSpan={5} className="whitespace-nowrap px-2 py-2 text-sheriff-paper-muted">—</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
            {sheriffs.length > 0 && (
              <div className="mt-2 px-2 pb-3 text-xs text-sheriff-paper-muted sm:hidden">
                Glissez horizontalement pour parcourir l&apos;armement et les véhicules de tout le bureau.
              </div>
            )}
            {sheriffs.length === 0 && (
              <EmptyTableState
                message="Aucun shérif."
                subtitle="Les armes et véhicules apparaîtront ici dès qu'une fiche sera créée."
              />
            )}
          </div>
        </div>
      )}

      {activeTab === "formations" && (
        <div role="tabpanel" aria-label="Formations du bureau">
          <SectionTable
            title="Formations"
            description="Toutes les formations sont visibles. Cadenas si vous n'avez pas le grade pour valider. Pour soi : uniquement Sheriff de comté."
            columns={[
              {
                key: "nom",
                label: "NOM",
                headerClassName:
                  "sticky left-0 z-10 w-36 shrink-0 bg-sheriff-charcoal/95 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.25)]",
              },
              ...displayFormations.map((f) => ({
                key: f.id,
                label: f.label || "(sans nom)",
                align: "center" as const,
                headerClassName: "px-1",
              })),
            ]}
            emptyMessage="Aucun shérif."
            emptySubtitle="Les formations validées s'afficheront ici par shérif."
            footer={
              sheriffs.length > 0
                ? "Glissez horizontalement pour parcourir toutes les formations visibles pour le bureau."
                : undefined
            }
          >
            {bureauRows.map(({ sheriff, record: r }) => (
              <tr
                key={r?.id ?? `sheriff-${sheriff.username}`}
                className="group transition hover:bg-sheriff-gold/5"
              >
                <td className="sticky left-0 z-1 w-36 shrink-0 whitespace-nowrap bg-sheriff-wood px-2 py-2 font-medium text-sheriff-paper shadow-[2px_0_6px_-2px_rgba(0,0,0,0.25)] group-hover:bg-sheriff-gold/5">
                  {sheriff.username}
                </td>
                {displayFormations.map((f) => {
                  const targetGrade = r
                    ? resolveRowGrade(r.grade, sheriff.grade)
                    : resolveRowGrade(undefined, sheriff.grade);
                  const targetGradeOrder = targetGrade != null ? GRADE_ORDER[targetGrade] ?? null : null;
                  const currentUserOrder = currentGrade != null ? GRADE_ORDER[currentGrade] ?? null : null;
                  const maxGradeOrder =
                    "maxGradeOrder" in f && typeof f.maxGradeOrder === "number" ? f.maxGradeOrder : 4;
                  const formationAppliesToRow =
                    targetGradeOrder === null || maxGradeOrder >= targetGradeOrder;
                  const lockedByGrade =
                    currentUserOrder !== null && currentUserOrder > maxGradeOrder;
                  let editable = false;
                  let disabledReason: string | undefined;
                  if (lockedByGrade) {
                    disabledReason = "Formation réservée à un grade supérieur au vôtre.";
                  } else if (r) {
                    if (isOwnRecord(r.name)) {
                      const isSheriffComte = currentGrade === "Sheriff de comté";
                      editable = isSheriffComte;
                      if (!editable) {
                        disabledReason = "Seul le Sheriff de comté peut valider ses propres formations.";
                      }
                    } else if (currentGrade) {
                      const actorOrder = GRADE_ORDER[currentGrade] ?? null;
                      const targetOrder = targetGrade != null ? GRADE_ORDER[targetGrade] ?? null : null;
                      if (
                        actorOrder !== null &&
                        targetOrder !== null &&
                        actorOrder <= 2 &&
                        actorOrder < targetOrder
                      ) {
                        editable = true;
                      }
                    }
                  }
                  const value = r?.formationValidations?.[f.id] === true;
                  return (
                    <td key={f.id} className="px-1 py-2 text-center">
                      {!formationAppliesToRow ? (
                        <span
                          className="inline-flex items-center justify-center text-sheriff-paper-muted"
                          title="Formation non applicable à ce grade."
                        >
                          <LockIcon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                        </span>
                      ) : r ? (
                        editable ? (
                          <input
                            type="checkbox"
                            checked={value}
                            disabled={updating === r.id}
                            onChange={() =>
                              patchRecord(r.id, {
                                formationValidations: {
                                  ...(r.formationValidations ?? {}),
                                  [f.id]: !value,
                                },
                              })
                            }
                            className="sheriff-checkbox inline-block align-middle"
                            aria-label={f.label || "(sans nom)"}
                          />
                        ) : lockedByGrade ? (
                          <span
                            className="inline-flex items-center justify-center text-sheriff-paper-muted"
                            title={disabledReason ?? "Formation réservée à un grade supérieur au vôtre."}
                          >
                            <LockIcon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center justify-center text-sheriff-paper-muted"
                            title={disabledReason ?? "Vous n'avez pas le grade pour valider cette formation."}
                          >
                            {value ? "✓" : "—"}
                          </span>
                        )
                      ) : (
                        <span className="text-sheriff-paper-muted">{value ? "✓" : "—"}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </SectionTable>
        </div>
      )}
    </div>
  );
}
