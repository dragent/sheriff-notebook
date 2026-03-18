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
import { ComptabiliteSection, type SheriffOption } from "@/components/comptabilite/ComptabiliteSection";
import { getBackendBase } from "@/lib/proxyBackend";

export const dynamic = "force-dynamic";

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
 * Récupère la liste des sheriffs pour les options (comptabilité).
 */
async function fetchSheriffs(backendBaseUrl: string): Promise<SheriffOption[]> {
  try {
    const res = await fetch(`${backendBaseUrl}/api/sheriffs`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ id: string; username: string }>;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Page Comptabilité — accès Sheriff de comté / Adjoint.
 */
export default async function ComptabilitePage() {
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
      "Vous n'avez pas le grade nécessaire pour accéder à la page Comptabilité.",
    );
  }

  const sheriffs = await fetchSheriffs(backendBaseUrl);

  return (
    <div
      className="sheriff-paper-bg flex min-h-[60vh] flex-1 flex-col"
      aria-label="Comptabilité — registre des recettes et dépenses"
    >
      <section
        className="page-container flex flex-1 flex-col"
        aria-labelledby="comptabilite-heading"
      >
        <PageHeader
          headingId="comptabilite-heading"
          title="Comptabilité"
          subtitle="Registre des recettes, dépenses et soldes du bureau d'Annesburg — Sheriff de comté et Adjoint."
          icon={PageIcons.comptabilite}
        />

        <PageIntroBlock
          items={[
            "Consulter et enregistrer les recettes et dépenses du bureau.",
            "Filtrer par shérif pour suivre les montants associés à chacun.",
            "Préparer facilement vos bilans et comptes-rendus intercomté.",
          ]}
        />

        <ComptabiliteSection sheriffs={sheriffs} />
      </section>
    </div>
  );
}
