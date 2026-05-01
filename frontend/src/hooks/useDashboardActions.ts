"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost } from "@/lib/apiClient";
import { DASHBOARD_API_ERROR_MESSAGES } from "@/lib/apiErrors";
import { canPlanningAdminActions } from "@/lib/grades";
import type { ServiceRecordFull } from "@/components/dashboard/Dashboard";

type Options = {
  /** Current user's grade. Required to disambiguate planning vs self error
   *  messages on 403 responses. */
  currentGrade?: string | null;
};

/**
 * Hook that owns the dashboard's HR / planning state machine:
 * one error string + a couple of inflight ids, plus the four mutations that
 * call the backend through {@link apiPatch} / {@link apiPost}.
 *
 * Extracted from Dashboard.tsx so the orchestrator can stay focused on
 * layout, and so the action layer can be tested in isolation.
 */
export function useDashboardActions({ currentGrade }: Options) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [cleaningPlanning, setCleaningPlanning] = useState(false);
  const [patchError, setPatchError] = useState<string | null>(null);

  async function patchRecord(
    id: string,
    payload: Partial<ServiceRecordFull>,
  ): Promise<void> {
    setPatchError(null);
    setUpdating(id);
    const result = await apiPatch(`/api/services/${id}`, payload);
    setUpdating(null);
    if (result.ok) {
      router.refresh();
      return;
    }
    if (result.status === 403) {
      const err =
        result.raw && typeof result.raw === "object" && "error" in result.raw
          ? String((result.raw as { error?: unknown }).error ?? "")
          : "";
      if (err.includes("formation")) {
        setPatchError(DASHBOARD_API_ERROR_MESSAGES.formation);
      } else if (canPlanningAdminActions(currentGrade ?? null)) {
        setPatchError(DASHBOARD_API_ERROR_MESSAGES.planningOther);
      } else {
        setPatchError(DASHBOARD_API_ERROR_MESSAGES.planningSelf);
      }
    } else {
      setPatchError(result.error);
    }
  }

  async function deleteSheriff(userId: string): Promise<void> {
    setPatchError(null);
    setDeletingId(userId);
    const result = await apiPatch(
      `/api/users/${userId}`,
      { grade: null },
      { forbiddenMessage: DASHBOARD_API_ERROR_MESSAGES.delete },
    );
    setDeletingId(null);
    if (result.ok) {
      router.refresh();
      return;
    }
    setPatchError(result.error);
  }

  async function promoteSheriff(
    userId: string,
    newGrade: string,
  ): Promise<void> {
    setPatchError(null);
    setPromotingId(userId);
    const result = await apiPatch<{ discordRoleError?: string }>(
      `/api/users/${userId}`,
      { grade: newGrade },
      { forbiddenMessage: DASHBOARD_API_ERROR_MESSAGES.promote },
    );
    setPromotingId(null);
    if (result.ok) {
      if (result.data?.discordRoleError) {
        window.alert(
          String(result.data.discordRoleError) ||
            "Grade enregistré, mais le rôle Discord n'a pas pu être mis à jour.",
        );
      }
      router.refresh();
      return;
    }
    setPatchError(result.error);
  }

  async function clearPlanningTable(): Promise<void> {
    if (!canPlanningAdminActions(currentGrade ?? null)) return;
    if (
      !window.confirm(
        "Réinitialiser toutes les cases de présence (jour et soir) pour tout le bureau ? Cette action vide la grille pour la semaine affichée.",
      )
    ) {
      return;
    }
    setPatchError(null);
    setCleaningPlanning(true);
    const result = await apiPost("/api/services/planning/reset", undefined, {
      forbiddenMessage: DASHBOARD_API_ERROR_MESSAGES.resetPlanning,
    });
    setCleaningPlanning(false);
    if (result.ok) {
      router.refresh();
      return;
    }
    setPatchError(result.error);
  }

  return {
    updating,
    deletingId,
    promotingId,
    cleaningPlanning,
    patchError,
    setPatchError,
    patchRecord,
    deleteSheriff,
    promoteSheriff,
    clearPlanningTable,
  };
}
