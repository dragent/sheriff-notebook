import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createBackendJwt } from "@/lib/backendJwt";
import { canAccessSaisiesPage } from "@/lib/sheriffAuth";
import { ROUTES } from "@/lib/routes";
import { redirectWithAccessDenied } from "@/lib/flashRedirect";
import { getBackendBase } from "@/lib/proxyBackend";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageIcons } from "@/components/layout/PageIcons";
import { PageIntroBlock } from "@/components/layout/PageIntroBlock";
import { ErrorState } from "@/components/ui/ErrorState";
import { SaisiesForm } from "@/components/saisies/SaisiesForm";
import {
  normalizeReferenceData,
  getWeaponsByCategory,
  type ReferenceData,
} from "@/lib/reference";
import type { SheriffOption } from "@/components/comptabilite/ComptabiliteSection";

export const dynamic = "force-dynamic";

type MeResponse = { grade: string | null };

/** Une ligne de saisie telle que renvoyée par l’API (GET /api/saisies). */
export type SaisieRecord = {
  id: string;
  type: "item" | "weapon" | "cash";
  date: string;
  sheriff: string;
  quantity: number;
  itemName: string | null;
  weaponModel: string | null;
  serialNumber: string | null;
  possessedBy: string | null;
  notes: string | null;
};

type ReferenceResponse = {
  data: ReferenceData;
};

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

async function fetchReference(
  backendBaseUrl: string,
  token: string
): Promise<{ data: ReferenceResponse | null; error: string | null }> {
  try {
    const res = await fetch(`${backendBaseUrl}/api/reference`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Bearer-Token": token,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        data: null,
        error: `Référentiel indisponible (${res.status}). Réessayez ou saisissez les noms à la main.`,
      };
    }
    const data = (await res.json()) as ReferenceResponse;
    return { data, error: null };
  } catch {
    return {
      data: null,
      error: "Impossible de charger le référentiel (réseau ou backend). Saisie manuelle possible.",
    };
  }
}

async function fetchSheriffs(
  backendBaseUrl: string
): Promise<{ sheriffs: SheriffOption[]; error: string | null }> {
  try {
    const res = await fetch(`${backendBaseUrl}/api/sheriffs`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        sheriffs: [],
        error: "Liste des shérifs indisponible. Choisir un shérif ne sera pas possible.",
      };
    }
    const data = (await res.json()) as Array<{ id: string; username: string }>;
    return {
      sheriffs: Array.isArray(data) ? data : [],
      error: null,
    };
  } catch {
    return {
      sheriffs: [],
      error: "Impossible de charger la liste des shérifs (réseau ou backend).",
    };
  }
}

async function fetchSaisies(
  backendBaseUrl: string,
  token: string
): Promise<{ data: SaisieRecord[]; error: string | null }> {
  try {
    const res = await fetch(`${backendBaseUrl}/api/saisies`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Bearer-Token": token,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        data: [],
        error: `Saisies indisponibles (${res.status}). Les nouvelles saisies seront enregistrées à l'envoi.`,
      };
    }
    const json = (await res.json()) as { data?: SaisieRecord[] };
    const list = Array.isArray(json?.data) ? json.data : [];
    return { data: list, error: null };
  } catch {
    return {
      data: [],
      error: "Impossible de charger les saisies existantes (réseau ou backend). Vous pouvez quand même en ajouter.",
    };
  }
}

/**
 * Page Saisies — enregistrement des saisies d’armes et d’items.
 * Accès réservé aux personnes ayant un grade sheriff (tous grades).
 */
export default async function SaisiesPage() {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    redirect(ROUTES.HOME);
  }
  if (!session) {
    redirect(ROUTES.HOME);
  }

  let backendBaseUrl: string;
  try {
    backendBaseUrl = getBackendBase();
  } catch {
    return (
      <div className="sheriff-paper-bg flex min-h-[60vh] flex-1 flex-col">
        <section className="page-container flex flex-1 flex-col">
          <ErrorState
            title="Backend injoignable"
            description="La configuration du serveur est manquante ou incorrecte. Vérifiez BACKEND_BASE_URL et réessayez."
          />
        </section>
      </div>
    );
  }

  const token = createBackendJwt(session);

  const [me, referenceResult, sheriffsResult, saisiesResult] = await Promise.all([
    fetchMe(backendBaseUrl, token),
    fetchReference(backendBaseUrl, token),
    fetchSheriffs(backendBaseUrl),
    fetchSaisies(backendBaseUrl, token),
  ]);

  if (!me || !canAccessSaisiesPage(me.grade ?? null)) {
    redirectWithAccessDenied(
      "Vous n'avez pas le grade nécessaire pour accéder à la page Saisies.",
    );
  }

  type WeaponCategory = { label: string; weapons: string[] };
  type ItemCategoryOption = { name: string; items: { name: string }[] };
  let weaponCategories: WeaponCategory[] = [];
  let itemCategories: ItemCategoryOption[] = [];

  if (referenceResult.data) {
    const normalized = normalizeReferenceData(referenceResult.data.data as unknown as Record<string, unknown>) as ReferenceData;
    weaponCategories = getWeaponsByCategory(normalized);
    itemCategories = normalized.itemCategories
      .filter((cat) => cat.items?.length)
      .map((cat) => ({
        name: cat.name,
        items: cat.items
          .filter((item) => typeof item.name === "string" && item.name.trim().length > 0)
          .map((item) => ({ name: item.name })),
      }))
      .filter((cat) => cat.items.length > 0);
  }

  const loadErrors: { reference?: string; sheriffs?: string; saisies?: string } = {};
  if (referenceResult.error) loadErrors.reference = referenceResult.error;
  if (sheriffsResult.error) loadErrors.sheriffs = sheriffsResult.error;
  if (saisiesResult.error) loadErrors.saisies = saisiesResult.error;

  return (
    <div
      className="sheriff-paper-bg flex min-h-[60vh] flex-1 flex-col"
      aria-label="Saisies — enregistrement des armes et items saisis"
    >
      <section
        className="page-container flex flex-1 flex-col"
        aria-labelledby="saisies-heading"
      >
        <PageHeader
          headingId="saisies-heading"
          title="Saisies"
          subtitle="Saisie rapide des armes, items et dollares confisqués, avec inventaires et total des sommes saisies."
          hint="Pensé pour remplacer votre feuille de calcul : navigation fluide, suggestions depuis le référentiel et résumé visuel."
          icon={PageIcons.saisies}
        />

        <PageIntroBlock
          items={[
            "Enregistrer chaque saisie d’arme, d’item ou de dollares (montant, date, shérif, contexte).",
            "Retrouver rapidement les saisies récentes durant votre service.",
            "Bénéficier des suggestions d’armes et d’objets issues du référentiel, tout en gardant la saisie manuelle possible.",
          ]}
        />

        {(loadErrors.reference || loadErrors.sheriffs || loadErrors.saisies) && (
          <div className="mb-6 text-sheriff-sortie">
            <span className="block text-xs font-semibold uppercase tracking-wider">
              Données partielles
            </span>
            {loadErrors.reference && <span className="block text-sm">{loadErrors.reference}</span>}
            {loadErrors.sheriffs && <span className="block text-sm">{loadErrors.sheriffs}</span>}
            {loadErrors.saisies && <span className="block text-sm">{loadErrors.saisies}</span>}
            <span className="mt-1 block text-xs opacity-90">
              Vous pouvez continuer : les champs restent saisissables à la main.
            </span>
          </div>
        )}

        <SaisiesForm
          sheriffs={sheriffsResult.sheriffs}
          weaponCategories={weaponCategories}
          itemCategories={itemCategories}
          initialRows={saisiesResult.data.map((r) => ({
            id: r.id,
            type: r.type,
            date: r.date,
            sheriff: r.sheriff,
            quantity: r.quantity,
            itemName: r.itemName ?? "",
            possessedBy: r.possessedBy ?? "",
            weaponModel: r.weaponModel ?? "",
            serialNumber: r.serialNumber ?? "",
            notes: r.notes ?? "",
          }))}
        />
      </section>
    </div>
  );
}

