"use client";

import { Fragment } from "react";
import { PLANNING_COLUMNS, PLANNING_DAY_GROUPS } from "@/lib/formations";
import { EmptyTableState } from "@/components/ui/EmptyTableState";
import { GradeBadge } from "@/components/ui/GradeBadge";
import {
  GRADE_ORDER,
  canPlanningAdminActions,
  resolveRowGrade,
  resolveRowGradeForDemotion,
} from "@/lib/grades";
import {
  canDeleteSheriffRow,
  getNextDemotionGrade,
  getNextPromotionGrade,
} from "@/lib/dashboardPermissions";
import type { ServiceRecordFull } from "@/components/dashboard/Dashboard";
import type { BureauRow } from "@/components/dashboard/dashboardShared";

type Props = {
  bureauRows: BureauRow[];
  sheriffsCount: number;
  currentGrade?: string | null;
  currentUsername?: string | null;
  updating: string | null;
  deletingId: string | null;
  promotingId: string | null;
  cleaningPlanning: boolean;
  onPatchRecord: (id: string, payload: Partial<ServiceRecordFull>) => Promise<void>;
  onPromoteSheriff: (userId: string, newGrade: string) => Promise<void>;
  onDeleteSheriff: (userId: string) => Promise<void>;
  onClearPlanning: () => Promise<void>;
};

function ciEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.localeCompare(b, undefined, { sensitivity: "base" }) === 0;
}

/**
 * "Planning / Paie" tab — registry-style ledger with two-level day headers,
 * RH actions (promotion / demotion / dismissal) on the right.
 */
export function DashboardPlanningTab({
  bureauRows,
  sheriffsCount,
  currentGrade,
  currentUsername,
  updating,
  deletingId,
  promotingId,
  cleaningPlanning,
  onPatchRecord,
  onPromoteSheriff,
  onDeleteSheriff,
  onClearPlanning,
}: Props) {
  const isOwnRecord = (recordName: string) => ciEquals(recordName, currentUsername);
  const canEditRecord = (recordName: string) => isOwnRecord(recordName);

  return (
    <div
      className="sheriff-card sheriff-card--paper w-full overflow-hidden rounded-lg border-sheriff-gold/40 shadow-md"
      role="tabpanel"
      aria-label="Planning et paie du bureau"
    >
      <div className="flex flex-col gap-3 border-b border-sheriff-gold/40 bg-sheriff-charcoal/80 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-sheriff-gold">
            Planning &amp; paie — {sheriffsCount} / 15 shérifs
          </h2>
          <p className="mt-1.5 text-xs text-sheriff-paper-muted/90">
            NOM · Télégramme · Grade · Recrutement · Présences jour/soir · Actions RH. Le Sheriff de
            comté, l&apos;Adjoint et le Sheriff en chef peuvent valider ou retirer les présences sur
            toutes les fiches du bureau (en plus de la leur).
          </p>
        </div>
        {canPlanningAdminActions(currentGrade ?? null) && (
          <button
            type="button"
            onClick={() => void onClearPlanning()}
            disabled={cleaningPlanning || sheriffsCount === 0}
            className="sheriff-focus-ring shrink-0 rounded border border-sheriff-gold/35 bg-sheriff-charcoal/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-sheriff-gold hover:bg-sheriff-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cleaningPlanning ? "Réinitialisation…" : "Réinitialiser le planning"}
          </button>
        )}
      </div>
      <div className="sheriff-table-scroll overflow-x-auto">
        <table className="sheriff-table--ledger w-full text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-sheriff-charcoal/95 text-[11px] uppercase tracking-wide text-sheriff-gold/90">
              <th
                rowSpan={2}
                className="sheriff-sticky-col-shadow sheriff-table-head-rule sticky left-0 z-10 whitespace-nowrap px-2 py-2 font-heading bg-sheriff-charcoal/95"
              >
                NOM
              </th>
              <th rowSpan={2} className="sheriff-table-head-rule whitespace-nowrap px-2 py-2 font-heading">Télégramme</th>
              <th rowSpan={2} className="sheriff-table-head-rule whitespace-nowrap px-2 py-2 text-center font-heading">Grade</th>
              <th rowSpan={2} className="sheriff-table-head-rule whitespace-nowrap px-2 py-2 font-heading">Recrutement</th>
              {PLANNING_DAY_GROUPS.map((day) => (
                <th
                  key={day.label}
                  colSpan={day.keys.length}
                  className="whitespace-nowrap border-b border-sheriff-brass-soft px-1 pb-0.5 pt-2 text-center font-heading text-sheriff-brass"
                  title={day.fullLabel}
                >
                  {day.label}
                </th>
              ))}
              <th rowSpan={2} className="sheriff-table-head-rule whitespace-nowrap px-2 py-2 text-center font-heading">Promotion</th>
              <th rowSpan={2} className="sheriff-table-head-rule whitespace-nowrap px-2 py-2 text-center font-heading">Rétrogradation</th>
              <th rowSpan={2} className="sheriff-table-head-rule whitespace-nowrap px-2 py-2 text-center font-heading">Licenciement</th>
            </tr>
            <tr className="sheriff-table-head-rule bg-sheriff-charcoal/95 text-[10px] uppercase tracking-wide text-sheriff-gold/80">
              {PLANNING_DAY_GROUPS.map((day) => (
                <Fragment key={day.label}>
                  <th
                    className="font-stamp whitespace-nowrap px-1 pb-1 pt-0.5 text-center font-normal"
                    title={`${day.fullLabel} — Jour`}
                  >
                    Jour
                  </th>
                  <th
                    className="font-stamp whitespace-nowrap px-1 pb-1 pt-0.5 text-center font-normal"
                    title={`${day.fullLabel} — Soir`}
                  >
                    Soir
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-sheriff-gold/20">
            {bureauRows.map(({ sheriff, record: r }) =>
              r ? (
                <tr key={r.id} className="group transition hover:bg-sheriff-gold/5">
                  <td className="sticky left-0 z-1 w-36 shrink-0 whitespace-nowrap bg-sheriff-wood px-2 py-2 font-medium text-sheriff-paper sheriff-sticky-col-shadow group-hover:bg-sheriff-gold/5">
                    {r.name}
                  </td>
                  <td className="font-stamp whitespace-nowrap px-2 py-2 text-sheriff-paper-muted">{r.telegramPrimary ?? "—"}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-center">
                    <GradeBadge grade={resolveRowGrade(r.grade, sheriff.grade)} size="sm" iconOnly />
                  </td>
                  <td className="font-stamp whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper-muted">
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
                    const planningAdmin =
                      canPlanningAdminActions(currentGrade ?? null) && !cleaningPlanning;
                    const editable = canEditRecord(r.name) || planningAdmin;
                    const isOwnRow = canEditRecord(r.name);
                    let checkboxTitle: string | undefined;
                    if (!editable) {
                      checkboxTitle = "Modification réservée à votre propre fiche";
                    } else if (planningAdmin && !isOwnRow) {
                      checkboxTitle =
                        "Valider ou retirer la présence sur la fiche d’un autre membre";
                    }
                    return (
                      <td key={col.key} className="px-1 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={(r as unknown as Record<string, unknown>)[col.key] as boolean}
                          disabled={updating === r.id || cleaningPlanning || !editable}
                          readOnly={!editable}
                          onChange={() => {
                            if (!editable || cleaningPlanning) return;
                            void onPatchRecord(r.id, {
                              [col.key]: !(r as unknown as Record<string, unknown>)[col.key],
                            } as Partial<ServiceRecordFull>);
                          }}
                          className="sheriff-checkbox inline-block align-middle"
                          title={checkboxTitle}
                          aria-label={col.label}
                        />
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-2 py-2 text-center">
                    {(() => {
                      const targetGrade = resolveRowGrade(r.grade, sheriff.grade);
                      const nextGrade = getNextPromotionGrade(currentGrade, targetGrade);
                      if (!nextGrade) {
                        return <span className="text-sheriff-paper-muted text-xs">—</span>;
                      }
                      return (
                        <button
                          type="button"
                          onClick={() => onPromoteSheriff(sheriff.id, nextGrade)}
                          disabled={promotingId === sheriff.id}
                          className="sheriff-focus-ring sheriff-btn-promote inline-flex w-full flex-col items-center justify-center gap-0 rounded px-2 py-1 text-xs font-semibold leading-tight disabled:opacity-50"
                          title={`Promouvoir en ${nextGrade}`}
                        >
                          <span className="font-stamp text-[9px] uppercase tracking-[0.18em] opacity-70" aria-hidden>
                            Acte
                          </span>
                          <span>{promotingId === sheriff.id ? "…" : "Promouvoir"}</span>
                        </button>
                      );
                    })()}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-center">
                    {(() => {
                      const targetGrade = resolveRowGradeForDemotion(r.grade, sheriff.grade);
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
                          onClick={() => onPromoteSheriff(sheriff.id, previousGrade)}
                          disabled={promotingId === sheriff.id}
                          className="sheriff-focus-ring sheriff-btn-demote inline-flex w-full flex-col items-center justify-center gap-0 rounded px-2 py-1 text-xs font-semibold leading-tight disabled:opacity-50"
                          title={`Rétrograder en ${previousGrade}`}
                        >
                          <span className="font-stamp text-[9px] uppercase tracking-[0.18em] opacity-70" aria-hidden>
                            Acte
                          </span>
                          <span>{promotingId === sheriff.id ? "…" : "Rétrograder"}</span>
                        </button>
                      );
                    })()}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-center">
                    {canDeleteSheriffRow(
                      currentGrade,
                      resolveRowGrade(r.grade, sheriff.grade),
                      currentUsername,
                      sheriff.username,
                    ) &&
                      (() => {
                        const targetGrade = resolveRowGrade(r.grade, sheriff.grade);
                        const isComte = targetGrade === "Sheriff de comté";
                        const label = isComte ? "Remercier" : "Licencier";
                        return (
                          <button
                            type="button"
                            onClick={() => onDeleteSheriff(sheriff.id)}
                            disabled={deletingId === sheriff.id}
                            className="sheriff-focus-ring sheriff-btn-destructive inline-flex w-full flex-col items-center justify-center gap-0 rounded px-2 py-1 text-xs font-semibold leading-tight disabled:opacity-50"
                          >
                            <span className="font-stamp text-[9px] uppercase tracking-[0.18em] opacity-70" aria-hidden>
                              Avis
                            </span>
                            <span>{deletingId === sheriff.id ? "…" : label}</span>
                          </button>
                        );
                      })()}
                  </td>
                </tr>
              ) : (
                <tr key={`sheriff-${sheriff.username}`} className="group transition hover:bg-sheriff-gold/5">
                  <td className="sticky left-0 z-1 w-36 shrink-0 whitespace-nowrap bg-sheriff-wood px-2 py-2 font-medium text-sheriff-paper sheriff-sticky-col-shadow group-hover:bg-sheriff-gold/5">
                    {sheriff.username}
                  </td>
                  <td className="font-stamp whitespace-nowrap px-2 py-2 text-sheriff-paper-muted">—</td>
                  <td className="whitespace-nowrap px-2 py-2 text-center">
                    <GradeBadge grade={sheriff.grade} size="sm" iconOnly />
                  </td>
                  <td className="font-stamp whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper-muted">
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
              ),
            )}
          </tbody>
        </table>
        {sheriffsCount > 0 && (
          <div className="mt-2 px-2 pb-3 text-xs text-sheriff-paper-muted sm:hidden">
            Glissez horizontalement pour voir tout le planning et les actions RH.
          </div>
        )}
        <p className="mt-1 px-2 pb-3 text-[11px] text-sheriff-paper-muted/80">
          Promotion, rétrogradation et licenciement sont réservés aux grades Sheriff de comté / Adjoint,
          en fonction de la hiérarchie des grades.
        </p>
        {sheriffsCount === 0 && (
          <EmptyTableState
            message="Aucun shérif."
            subtitle="La liste apparaîtra ici une fois les shérifs enregistrés."
          />
        )}
      </div>
    </div>
  );
}
