import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBackendJwt } from "@/lib/backendJwt";
import { canAccessComteAdjointPages } from "@/lib/sheriffAuth";
import { ROUTES } from "@/lib/routes";
import { redirectWithAccessDenied } from "@/lib/flashRedirect";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageIcons } from "@/components/layout/PageIcons";
import { PageIntroBlock } from "@/components/layout/PageIntroBlock";
import { ErrorState } from "@/components/ui/ErrorState";
import { ReferenceTableSection, type ReferenceData } from "@/components/reference";
import { getBackendBase } from "@/lib/proxyBackend";

export const dynamic = "force-dynamic";

type ReferenceResponse = {
  data: ReferenceData;
  updatedAt: string | null;
  canEdit: boolean;
};

type MeResponse = { grade: string | null };

/**
 * Récupère le profil /api/me pour vérifier le grade.
 */
async function fetchMe(
  backendBaseUrl: string,
  token: string
): Promise<MeResponse | null> {
  try {
    const res = await fetch(`${backendBaseUrl}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Bearer-Token": token,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as MeResponse;
  } catch {
    return null;
  }
}

/**
 * Récupère le référentiel /api/reference.
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
 * Page Référentiel (armes, items) — accès Sheriff de comté / Adjoint.
 */
export default async function ReferencePage() {
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
  if (!me || !canAccessComteAdjointPages(me.grade ?? null)) {
    redirectWithAccessDenied(
      "Vous n'avez pas le grade nécessaire pour accéder à la page Référentiel.",
    );
  }

  const reference = await fetchReference(backendBaseUrl, token);

  return (
    <div
      className="sheriff-paper-bg flex min-h-[60vh] flex-1 flex-col"
      aria-label="Référentiel — armes, items et informations"
    >
      <section
        className="page-container flex flex-1 flex-col"
        aria-labelledby="reference-heading"
      >
        <PageHeader
          headingId="reference-heading"
          title="Référentiel"
          subtitle="Armes, items et valeurs de destruction — une seule source de vérité pour le comté."
          hint="Modifiable par Sheriff de comté et Adjoint uniquement."
          icon={PageIcons.reference}
        />

        <PageIntroBlock
          items={[
            "Centraliser les armes, items et valeurs de destruction utilisées par tout le bureau.",
            "Corriger ou compléter les libellés pour qu’ils restent parlants pour les shérifs.",
            "Garantir que les pages Saisies, Destruction et Coffres s’appuient toutes sur la même base.",
          ]}
        />

        {reference ? (
          <ReferenceTableSection
            data={reference.data}
            canEdit={reference.canEdit}
            updatedAt={reference.updatedAt}
          />
        ) : (
          <ErrorState
            title="Impossible de charger le référentiel"
            description="Vérifiez que le backend est disponible et réessayez en actualisant la page."
          />
        )}
      </section>
    </div>
  );
}
