import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBackendJwt } from "@/lib/backendJwt";
import { ROUTES } from "@/lib/routes";
import { redirectWithAccessDenied } from "@/lib/flashRedirect";
import { getBackendBase } from "@/lib/proxyBackend";
import { CopyMarkdownButton } from "@/components/ui/CopyMarkdownButton";
import { discordMarkdownToHtml } from "@/lib/discordMarkdown";

export const dynamic = "force-dynamic";

type EffectifResponse = {
  markdown?: string;
  effectif?: number;
  maxEffectif?: number;
  date?: string;
  error?: string;
};

async function fetchEffectif(token: string): Promise<EffectifResponse | null> {
  const base = getBackendBase();
  try {
    const res = await fetch(`${base}/api/discord/effectif`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Bearer-Token": token,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as EffectifResponse;
  } catch {
    return null;
  }
}

/**
 * Page « Preview » du message effectif Discord, ouverte dans un nouvel onglet.
 * Affiche le markdown comme Discord le rendrait (style bloc sombre).
 */
export default async function EffectifPreviewPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirectWithAccessDenied(
      "Vous n'avez pas le grade nécessaire pour accéder à la prévisualisation de l'effectif.",
    );
  }

  const token = createBackendJwt(session);
  const data = await fetchEffectif(token);

  if (!data || data.error) {
    redirect(ROUTES.REFERENCE);
  }

  const markdown = data.markdown ?? "";
  const previewHtml = discordMarkdownToHtml(markdown);
  const title = "Preview — Effectif du bureau d’Annesburg";

  return (
    <div className="min-h-screen bg-[#313338] text-[#f2f3f5]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-[#b5bac1]">{title}</h1>
          <CopyMarkdownButton
            markdown={markdown}
            className="rounded-md border border-[#4e5058] bg-[#2b2d31] px-3 py-1.5 text-sm font-medium text-[#b5bac1] transition hover:bg-[#383a40] hover:text-[#f2f3f5] focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
          />
        </div>
        <div
          className="discord-message-preview rounded-lg border border-[#3f4147] bg-[#2b2d31] p-4 font-sans text-[15px] leading-relaxed text-[#f2f3f5] [&_.discord-h1]:mb-2 [&_.discord-h1]:mt-0 [&_.discord-h1]:text-lg [&_.discord-h1]:font-semibold [&_.discord-h1]:text-[#f2f3f5] [&_.discord-h3]:mb-1 [&_.discord-h3]:mt-3 [&_.discord-h3]:text-base [&_.discord-h3]:font-semibold [&_.discord-h3]:text-[#f2f3f5] [&_.discord-ul]:my-2 [&_.discord-ul]:list-disc [&_.discord-ul]:pl-5 [&_.discord-li]:my-0.5 [&_.discord-p]:my-1 [&_.discord-p]:text-[#b5bac1] [&_.discord-separator]:my-3 [&_.discord-separator]:h-px [&_.discord-separator]:bg-[#4e5058]"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
        {data.effectif != null && data.maxEffectif != null && (
          <p className="mt-3 text-sm text-[#b5bac1]">
            Effectif actuel : {data.effectif} / {data.maxEffectif} postes
            {data.date != null && (() => {
              const [d, m, y] = data.date.split("/");
              const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
              const dateFr = dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
              return ` — Dernière révision du registre : ${dateFr}`;
            })()}
          </p>
        )}
      </div>
    </div>
  );
}
