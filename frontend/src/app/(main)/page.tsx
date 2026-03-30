import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBackendJwt } from "@/lib/backendJwt";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeSignIn } from "@/components/home/HomeSignIn";
import { HomeRecruitmentOnly } from "@/components/home/HomeRecruitmentOnly";
import { HomeLoadingFallback } from "@/components/home/HomeLoadingFallback";
import {
  Dashboard,
  type ServiceRecordFull,
} from "@/components/dashboard/Dashboard";
import { RecruitPopup } from "@/components/dashboard/RecruitPopup";
import { HomeInfoSection } from "@/components/home/HomeInfoSection";
import type { HomeInfoCategory } from "@/lib/reference";
import { isSheriffUser } from "@/lib/backendMe";
import { compareGrades, COMTE_ADJOINT_GRADES } from "@/lib/grades";
import { getBackendBase } from "@/lib/proxyBackend";
import type { MeResponse } from "@/types/api";

export const dynamic = "force-dynamic";

export type Sheriff = {
  id: string;
  username: string;
  avatarUrl: string | null;
  grade: string;
  recruitedAt: string | null;
};

/**
 * Indique si l’utilisateur a un grade sheriff.
 */

/**
 * Indique si l'utilisateur peut gérer le recrutement / les promotions (Sheriff de comté ou adjoint).
 */
function canManageRecruitment(grade: string | null): boolean {
  if (!grade) return false;
  return COMTE_ADJOINT_GRADES.has(grade);
}

/** Plus ancienne recrutement en premier ; sans date en dernier au sein du même grade. */
function compareRecruitedAtIso(a: string | null, b: string | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a.localeCompare(b);
}

/**
 * Trie les sheriffs par grade puis par date de recrutement, puis par nom.
 */
function sortSheriffsByGrade(sheriffs: Sheriff[]): Sheriff[] {
  return [...sheriffs].sort((a, b) => {
    const byGrade = compareGrades(a.grade, b.grade);
    if (byGrade !== 0) return byGrade;
    const byDate = compareRecruitedAtIso(a.recruitedAt, b.recruitedAt);
    if (byDate !== 0) return byDate;
    return a.username.localeCompare(b.username, undefined, { sensitivity: "base" });
  });
}

/**
 * Récupère la liste des sheriffs depuis le backend.
 */
async function fetchSheriffs(): Promise<Sheriff[]> {
  const base = getBackendBase();
  try {
    const res = await fetch(`${base}/api/sheriffs`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as Sheriff[];
  } catch {
    return [];
  }
}

/**
 * Récupère les catégories d’infos d’accueil depuis le backend.
 */
async function fetchHomeInfo(): Promise<HomeInfoCategory[]> {
  const base = getBackendBase();
  try {
    const res = await fetch(`${base}/api/home-info`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { homeInfoCategories?: HomeInfoCategory[] };
    return Array.isArray(data?.homeInfoCategories) ? data.homeInfoCategories : [];
  } catch {
    return [];
  }
}

type BackendError = "network" | "unauthorized" | null;

/**
 * Récupère /api/me et /api/services en parallèle pour l’utilisateur connecté.
 */
async function fetchMeAndServices(
  backendBaseUrl: string,
  token: string
): Promise<{
  me: MeResponse | null;
  records: ServiceRecordFull[];
  backendError: BackendError;
}> {
  try {
    const backendHeaders = {
      Authorization: `Bearer ${token}`,
      "X-Bearer-Token": token,
    };
    const [meRes, servicesRes] = await Promise.all([
      fetch(`${backendBaseUrl}/api/me`, {
        headers: backendHeaders,
        cache: "no-store",
      }),
      fetch(`${backendBaseUrl}/api/services`, {
        headers: backendHeaders,
        cache: "no-store",
      }),
    ]);
    if (!meRes.ok) {
      const unauthorized =
        meRes.status >= 400 && meRes.status < 500;
      return {
        me: null,
        records: [],
        backendError: unauthorized ? "unauthorized" : null,
      };
    }
    const me = (await meRes.json()) as MeResponse;
    const records = servicesRes.ok
      ? (await servicesRes.json()) as ServiceRecordFull[]
      : [];
    return { me, records, backendError: null };
  } catch {
    return { me: null, records: [], backendError: "network" };
  }
}

/**
 * Page d’accueil : hero, recrutement ou tableau de bord selon le grade.
 */
export default async function Home() {
  const [session, sheriffsRaw, homeInfoCategories] = await Promise.all([
    getServerSession(authOptions),
    fetchSheriffs(),
    fetchHomeInfo(),
  ]);
  let sheriffs = sortSheriffsByGrade(sheriffsRaw);

  const backendBaseUrl = getBackendBase();
  let me: MeResponse | null = null;
  let serviceRecords: ServiceRecordFull[] = [];

  let _backendError: BackendError = null;
  if (session) {
    const token = createBackendJwt(session);
    const data = await fetchMeAndServices(backendBaseUrl, token);
    me = data.me;
    serviceRecords = data.records;
    _backendError = data.backendError;

    if (me?.grade && me?.username) {
      const m = me;
      const alreadyListed =
        (m.id != null && sheriffs.some((s) => s.id === m.id)) ||
        sheriffs.some(
          (s) => s.username.toLowerCase() === (m.username ?? "").toLowerCase()
        );
      if (!alreadyListed) {
        sheriffs = sortSheriffsByGrade([
          ...sheriffs,
          {
            id: me.id ?? "current-user",
            username: me.username,
            avatarUrl: me.avatarUrl ?? null,
            grade: me.grade,
            recruitedAt: me.recruitedAt ?? null,
          },
        ]);
      }
    }
  }

  const isSheriff = session && isSheriffUser(me);
  const showRecruitAction = session && canManageRecruitment(me?.grade ?? null);

  return (
    <div
      className="sheriff-paper-bg flex min-h-[60vh] flex-1 flex-col"
      aria-label="Page d'accueil — Bureau du Shérif Annesburg"
    >
      <section className="page-container flex flex-1 flex-col gap-10">
        {!isSheriff && (
          <>
            <HomeHero />
            <HomeRecruitmentOnly isConnected={!!session} />
            {!session && (
              <Suspense fallback={<HomeLoadingFallback />}>
                <HomeSignIn compact />
              </Suspense>
            )}
          </>
        )}

        {isSheriff && (
          <>
            {homeInfoCategories.length > 0 && (
              <HomeInfoSection
                categories={homeInfoCategories}
                action={showRecruitAction ? <RecruitPopup /> : undefined}
              />
            )}
            {homeInfoCategories.length === 0 && showRecruitAction && (
              <div className="flex justify-end">
                <RecruitPopup />
              </div>
            )}
            <section
              aria-label="Tableau de bord"
              className="sheriff-animate-in space-y-4 rounded-lg border border-sheriff-gold/25 bg-sheriff-charcoal/40 p-4 shadow-lg sm:p-5"
            >
              {homeInfoCategories.length === 0 && (
                <h2 className="font-heading text-xl font-semibold uppercase tracking-wider text-sheriff-gold sm:text-2xl">
                  Tableau de bord
                </h2>
              )}
              <div className="sheriff-table-scroll w-full overflow-x-auto -mx-1 px-1">
                <Dashboard
                  records={serviceRecords}
                  allowedFormations={me?.allowedFormations ?? []}
                  allFormations={me?.allFormations}
                  sheriffs={sheriffs.map((s) => ({
                    id: s.id,
                    username: s.username,
                    grade: s.grade,
                    recruitedAt: s.recruitedAt ?? null,
                  }))}
                  currentUsername={me?.username ?? null}
                  currentGrade={me?.grade ?? null}
                />
              </div>
            </section>
          </>
        )}
      </section>
    </div>
  );
}
