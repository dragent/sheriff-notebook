import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBackendJwt } from "@/lib/backendJwt";
import { ROUTES } from "@/lib/routes";
import { getBackendBase } from "@/lib/proxyBackend";
import type { SheriffOption } from "@/components/comptabilite/ComptabiliteSection";
import {
  normalizeReferenceData,
  getWeaponsByCategory,
  type ReferenceData,
  type WeaponCategoryOption,
} from "@/lib/reference";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageIcons } from "@/components/layout/PageIcons";
import { PageIntroBlock } from "@/components/layout/PageIntroBlock";
import { CoffresView } from "@/components/coffres/CoffresView";

export const dynamic = "force-dynamic";

async function fetchReference(
  backendBaseUrl: string,
  token: string
): Promise<WeaponCategoryOption[]> {
  try {
    const res = await fetch(`${backendBaseUrl}/api/reference`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Bearer-Token": token,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data: ReferenceData };
    const normalized = normalizeReferenceData(
      data.data as unknown as Record<string, unknown>
    ) as ReferenceData;
    return getWeaponsByCategory(normalized);
  } catch {
    return [];
  }
}

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
 * Page Coffres — inventaire du bureau (réservée aux utilisateurs connectés).
 */
export default async function CoffresPage() {
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
  const [weaponCategories, sheriffs] = await Promise.all([
    fetchReference(backendBaseUrl, token),
    fetchSheriffs(backendBaseUrl),
  ]);

  return (
    <div
      className="sheriff-paper-bg flex min-h-[60vh] flex-1 flex-col"
      aria-label="Coffres — inventaire du bureau"
    >
      <section
        className="page-container flex flex-1 flex-col"
        aria-labelledby="coffres-heading"
      >
        <PageHeader
          headingId="coffres-heading"
          title="Coffres"
          subtitle="Inventaire du bureau, recensement des armes (prêt, coffre, lunette)."
          icon={PageIcons.coffres}
        />

        <PageIntroBlock
          items={[
            "Consulter l’état des coffres et des armes associées (prêt, coffre, lunette).",
            "Vérifier rapidement si une arme figure au registre avant un prêt ou une restitution.",
            "S’appuyer sur les catégories d’armes du référentiel pour garder des libellés cohérents.",
          ]}
        />

        <CoffresView
          data={null}
          weaponCategories={weaponCategories}
          sheriffs={sheriffs}
        />
      </section>
    </div>
  );
}
