import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createBackendJwt } from "@/lib/backendJwt";
import { canAccessDestructionPage } from "@/lib/sheriffAuth";
import { ROUTES } from "@/lib/routes";
import { redirectWithAccessDenied } from "@/lib/flashRedirect";
import { getBackendBase } from "@/lib/proxyBackend";
import {
  normalizeReferenceData,
  type ReferenceData,
} from "@/lib/reference";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageIcons } from "@/components/layout/PageIcons";
import { PageIntroBlock } from "@/components/layout/PageIntroBlock";
import { ErrorState } from "@/components/ui/ErrorState";
import { Flashbag } from "@/components/feedback/Flashbag";
import { DestructionPageClient } from "@/components/destruction/DestructionPageClient";

export const dynamic = "force-dynamic";

type MeResponse = { grade: string | null };
type ReferenceResponse = { data: ReferenceData };

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
): Promise<ReferenceData | null> {
  try {
    const res = await fetch(`${backendBaseUrl}/api/reference`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Bearer-Token": token,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ReferenceResponse;
    const raw = json?.data as unknown;
    if (!raw || typeof raw !== "object") return null;
    return normalizeReferenceData(raw as Record<string, unknown>) as ReferenceData;
  } catch {
    return null;
  }
}

/**
 * Page Destruction — saisie des lignes de destruction (date, quantité, type).
 * Accès réservé aux personnes ayant un grade sheriff (même règle que Saisies).
 */
export default async function DestructionPage() {
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
            description="Vérifiez BACKEND_BASE_URL et réessayez."
          />
        </section>
      </div>
    );
  }

  let token: string;
  try {
    token = createBackendJwt(session);
  } catch {
    return (
      <div className="sheriff-paper-bg flex min-h-[60vh] flex-1 flex-col">
        <section className="page-container flex flex-1 flex-col">
          <ErrorState
            variant="config"
            title="Configuration d&apos;authentification manquante"
            description="Vérifiez BACKEND_JWT_SECRET et la session (discordId, username)."
          />
        </section>
      </div>
    );
  }

  const [me, reference] = await Promise.all([
    fetchMe(backendBaseUrl, token),
    fetchReference(backendBaseUrl, token),
  ]);

  if (!me || !canAccessDestructionPage(me.grade ?? null)) {
    redirectWithAccessDenied(
      "Vous n'avez pas le grade nécessaire pour accéder à la page Destruction.",
    );
  }

  const defaultDate = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="sheriff-paper-bg flex min-h-[60vh] flex-1 flex-col"
      aria-label="Destruction — saisie des lignes de destruction"
    >
      <section
        className="page-container flex flex-1 flex-col"
        aria-labelledby="destruction-heading"
      >
        <PageHeader
          headingId="destruction-heading"
          title="Destruction — Saisie"
          subtitle="Saisie des lignes de destruction : date, quantité et type (item, arme ou dollars saisis)."
          hint="Types proposés selon les saisies en base : armes, items et dollars (montant à détruire plafonné au reste saisi)."
          icon={PageIcons.destruction}
        />

        <PageIntroBlock
          items={[
            "Renseigner chaque destruction (date, quantité, type, montant de destruction).",
            "Aligner les montants avec le référentiel pour garder une base commune au comté.",
            "Préparer plus facilement vos rapports de destruction et contrôles ultérieurs.",
          ]}
        />

        {!reference && (
          <Flashbag variant="warning" className="mb-6">
            Référentiel indisponible. Vous pouvez saisir les montants à la main ; la liste des types de destruction sera vide.
          </Flashbag>
        )}

        <DestructionPageClient defaultDate={defaultDate} />
      </section>
    </div>
  );
}
