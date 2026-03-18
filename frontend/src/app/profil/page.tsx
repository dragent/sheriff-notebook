import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import Image from "next/image";
import { authOptions } from "@/lib/auth";
import { createBackendJwt } from "@/lib/backendJwt";
import { canAccessProfilPage } from "@/lib/sheriffAuth";
import { ROUTES } from "@/lib/routes";
import { redirectWithAccessDenied } from "@/lib/flashRedirect";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageIcons } from "@/components/layout/PageIcons";
import { PageIntroBlock } from "@/components/layout/PageIntroBlock";
import { ErrorState } from "@/components/ui/ErrorState";
import { ProfilSections } from "@/components/profil/ProfilSections";
import type { ProfilRecord } from "@/components/profil/ProfilForm";
import {
  getWeaponsByCategory,
  normalizeReferenceData,
} from "@/lib/reference";
import type { ServiceRecordFull } from "@/components/dashboard/Dashboard";
import { getBackendBase } from "@/lib/proxyBackend";

export const dynamic = "force-dynamic";

type MeResponse = {
  allowedFormations: { id: string; label: string }[];
  /** Catalogue complet (pour afficher toutes les formations accessibles, ex. Sheriff de comté). */
  allFormations?: { id: string; label: string }[];
  grade: string | null;
  recruitedAt: string | null;
};

/**
 * Récupère le profil /api/me (grade, formations autorisées).
 */
async function fetchMe(
  backendBaseUrl: string,
  token: string
): Promise<MeResponse | null> {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      "X-Bearer-Token": token,
    };
    const res = await fetch(`${backendBaseUrl}/api/me`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as MeResponse;
  } catch {
    return null;
  }
}

/**
 * Récupère la fiche de service du user connecté (/api/services/me).
 */
async function fetchMyServiceRecord(
  backendBaseUrl: string,
  token: string
): Promise<ServiceRecordFull | null> {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      "X-Bearer-Token": token,
    };
    const res = await fetch(`${backendBaseUrl}/api/services/me`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ServiceRecordFull;
  } catch {
    return null;
  }
}

type ReferenceResponse = {
  data: Record<string, unknown>;
  updatedAt: string | null;
  canEdit: boolean;
};

/**
 * Récupère le référentiel /api/reference (armes pour les selects).
 */
async function fetchReference(
  backendBaseUrl: string,
  token: string
): Promise<ReferenceResponse | null> {
  try {
    const res = await fetch(`${backendBaseUrl}/api/reference`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Bearer-Token": token,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ReferenceResponse;
  } catch {
    return null;
  }
}

/**
 * Mappe une fiche de service vers le format attendu par ProfilForm.
 */
function toProfilRecord(r: ServiceRecordFull): ProfilRecord {
  return {
    id: r.id,
    name: r.name,
    telegramPrimary: r.telegramPrimary,
    primaryWeapon: r.primaryWeapon,
    primaryWeaponSerial: r.primaryWeaponSerial,
    hasScope: r.hasScope,
    secondaryWeapon: r.secondaryWeapon,
    secondaryWeaponSerial: r.secondaryWeaponSerial,
    cartInfo: r.cartInfo,
    boatInfo: r.boatInfo,
  };
}

/**
 * Page Profil — fiche de service et formations (accès Sheriff de comté / Adjoint).
 */
export default async function ProfilPage() {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    redirect(ROUTES.HOME);
  }
  if (!session) {
    redirect(ROUTES.HOME);
  }

  const backendBaseUrl = getBackendBase();
  const token = createBackendJwt(session);

  const me = await fetchMe(backendBaseUrl, token);
  if (!me || !canAccessProfilPage(me.grade ?? null)) {
    redirectWithAccessDenied(
      "Vous n'avez pas le grade nécessaire pour accéder à la page Profil.",
    );
  }

  const [myRecord, reference] = await Promise.all([
    fetchMyServiceRecord(backendBaseUrl, token),
    fetchReference(backendBaseUrl, token),
  ]);

  const normalizedRef = reference
    ? normalizeReferenceData(reference.data)
    : null;
  const weaponOptionsByCategory = normalizedRef
    ? getWeaponsByCategory(normalizedRef)
    : [];

  if (!myRecord) {
    const flashbagMessage = "Impossible de charger votre fiche de service. Réessayez plus tard ou contactez un Sheriff de comté.";
    const homeWithFlashbag = `${ROUTES.HOME}?error=app&message=${encodeURIComponent(flashbagMessage)}`;
    return (
      <div
        className="sheriff-paper-bg flex min-h-[60vh] flex-1 flex-col"
        aria-label="Mon profil"
      >
        <section className="page-container flex flex-1 flex-col" aria-labelledby="profil-heading">
          <PageHeader
            headingId="profil-heading"
            title="Mon profil"
            subtitle="Gérez vos informations personnelles et consultez l'état de vos formations."
            icon={PageIcons.profil}
          />
          <ErrorState
            title="Impossible de charger votre fiche de service"
            description="Réessayez plus tard ou contactez un Sheriff de comté."
            href={homeWithFlashbag}
            variant="neutral"
          />
        </section>
      </div>
    );
  }

  return (
    <div
      className="sheriff-paper-bg flex min-h-[60vh] flex-1 flex-col"
      aria-label="Mon profil"
    >
      <section
        className="page-container flex flex-1 flex-col"
        aria-labelledby="profil-heading"
      >
        <header className="mb-8">
          <Link
            href={ROUTES.HOME}
            className="sheriff-focus-ring mb-4 inline-flex items-center gap-1.5 text-sm text-sheriff-paper-muted transition hover:text-sheriff-gold"
          >
            <span aria-hidden>←</span>
            Accueil
          </Link>
          <div className="flex items-start gap-3 sm:gap-4">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sheriff-gold/40 bg-sheriff-charcoal/80 text-sheriff-gold"
              aria-hidden
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h1
                id="profil-heading"
                className="font-heading text-xl font-semibold uppercase tracking-wider text-sheriff-gold sm:text-2xl"
              >
                Mon profil
              </h1>
              <p className="mt-2 text-sm text-sheriff-paper-muted sm:text-base">
                Gérez vos informations personnelles et consultez l’état de vos formations.
              </p>
            </div>
          </div>
          <div className="sheriff-divider mt-6" aria-hidden />
          <PageIntroBlock
            items={[
              "Mettre à jour vos informations de contact (télégramme) et votre armement.",
              "Préciser vos moyens de déplacement (calèche, bateau) pour le service.",
              "Consulter l’état de vos formations validées à votre grade.",
            ]}
          />
          {/* Carte d'identité — nom, grade, recrutement */}
          <div
            className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-sheriff-gold/25 bg-sheriff-charcoal/60 px-4 py-4 shadow-[inset_0_0_0_1px_rgba(184,184,184,0.06)] sm:flex-nowrap sm:gap-6"
            aria-label="Identité"
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-sheriff-gold/50 bg-sheriff-gold/15">
              {session.user?.image ? (
                <Image
                  src={session.user.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-heading text-lg font-semibold text-sheriff-gold">
                  {myRecord.name?.charAt(0)?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate font-heading text-base font-semibold text-sheriff-paper">
                {myRecord.name || "Shérif"}
              </p>
              {me?.grade && (
                <span className="inline-block rounded-md border border-sheriff-gold/40 bg-sheriff-gold/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-sheriff-gold">
                  {me.grade}
                </span>
              )}
              {me?.recruitedAt && (
                <p className="text-xs text-sheriff-paper-muted">
                  Recruté le{" "}
                  {new Date(me.recruitedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "Europe/Paris",
                  })}
                </p>
              )}
            </div>
          </div>

        </header>

        <div className="mt-6">
          <ProfilSections
            record={toProfilRecord(myRecord)}
            weaponOptionsByCategory={weaponOptionsByCategory}
            backendBaseUrl={backendBaseUrl}
            token={token}
            allowedFormations={
              me?.allowedFormations?.length
                ? me.allowedFormations
                : (me?.allFormations ?? []).map((f) => ({ id: f.id, label: f.label }))
            }
            formationValidations={myRecord.formationValidations ?? {}}
          />
        </div>
      </section>
    </div>
  );
}
