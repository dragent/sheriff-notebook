"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { discordMarkdownToHtml } from "@/lib/discordMarkdown";

type EffectifResponse = {
  markdown?: string;
  effectif?: number;
  maxEffectif?: number;
  date?: string;
  recruitmentTelegrams?: string[];
  error?: string;
};

type EffectifDiscordSectionProps = {
  compact?: boolean;
  variant?: "effectif" | "recruitment";
};

const RECRUITMENT_MARKDOWN_TEMPLATE = `━━━━━━━━━━━━━━━━━━
## :scroll: COMMUNIQUÉ OFFICIEL
━━━━━━━━━━━━━━━━━━

### :pick: :flag_us: **BUREAU DU SHÉRIFF D’ANNESBURG RECRUTE**
*{{AVAILABLE_PLACES}} places disponibles*
:round_pushpin: Ville portuaire de Van Horn


Annesburg est une ville forgée par le travail des mines et le passage constant d’hommes venus de tous horizons. Là où l’activité est intense, les troubles ne sont jamais loin.

Pour maintenir l’ordre et protéger la ville, le **Bureau du Shériff d’Annesburg** ouvre ses rangs.

Comme le faucon qui observe son territoire depuis les hauteurs, nos shériffs surveillent, enquêtent et agissent avec sang-froid lorsque la loi doit être appliquée.

Notre mission repose sur trois piliers :
**l’enquête**, **la communication entre shériffs des différents comtés**, et **le dialogue avec les civils afin de créer un véritable lien de confiance avec les habitants d’Annesburg**.

━━━━━━━━━━━━━━━━━━
### :mag_right: PROFILS RECHERCHÉS
━━━━━━━━━━━━━━━━━━

:small_blue_diamond: Citoyennes et citoyens âgés de minimum 18 ans
:small_blue_diamond: Esprit d’observation et sens de l’analyse
:small_blue_diamond: Capacité à mener des enquêtes et recueillir des témoignages
:small_blue_diamond: Sang-froid, discipline et sens du devoir
:small_blue_diamond: Respect de la loi et de l’autorité
:small_blue_diamond: Capacité à échanger avec les habitants et représenter la loi avec respect

━━━━━━━━━━━━━━━━━━
### :military_medal: MISSIONS PRINCIPALES
━━━━━━━━━━━━━━━━━━

:star: Conduire des enquêtes criminelles
:star: Recueillir et analyser les informations
:star: Maintenir la communication avec les shériffs des autres comtés
:star: Échanger avec les civils et renforcer la confiance entre la ville et la loi
:star: Protéger les habitants et les travailleurs d’Annesburg

━━━━━━━━━━━━━━━━━━
### :round_pushpin: POSTULER
━━━━━━━━━━━━━━━━━━

:mailbox: **Envoyez votre télégramme au {{TELEGRAMS}} pour déposer votre candidature.**

━━━━━━━━━━━━━━━━━━
:eagle: **Observer comme le faucon.
Comprendre avant d’agir.
Servir la loi et protéger la ville.**

:scales: La loi avant tout.
:star: Annesburg sous protection.`;
const RECRUITMENT_MAX_EFFECTIF = 15;

export function EffectifDiscordSection({
  compact,
  variant = "effectif",
}: EffectifDiscordSectionProps = {}) {
  const [data, setData] = useState<EffectifResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [sendState, setSendState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/discord/effectif", { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as EffectifResponse;
        if (!res.ok) {
          const message =
            typeof body?.error === "string" && body.error
              ? body.error
              : "Impossible de charger le message effectif.";
          return setData({ error: message });
        }
        setData(body);
      })
      .catch(() => setData({ error: "Impossible de charger le message." }))
      .finally(() => setLoading(false));
  }, [variant]);

  const recruitmentTelegrams = useMemo(() => {
    const list = data?.recruitmentTelegrams;
    if (!Array.isArray(list)) return [];
    return list.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  }, [data?.recruitmentTelegrams]);

  const recruitmentContactLabel = useMemo(() => {
    if (recruitmentTelegrams.length === 0) return "2327";
    return recruitmentTelegrams.join(" ou ");
  }, [recruitmentTelegrams]);
  const currentEffectif = typeof data?.effectif === "number" ? data.effectif : 0;
  const availablePlaces = Math.max(0, RECRUITMENT_MAX_EFFECTIF - currentEffectif);

  const markdown = useMemo(() => {
    if (variant === "recruitment") {
      return RECRUITMENT_MARKDOWN_TEMPLATE
        .replace("{{AVAILABLE_PLACES}}", String(availablePlaces))
        .replace("{{TELEGRAMS}}", recruitmentContactLabel);
    }
    return data?.markdown ?? "";
  }, [availablePlaces, data?.markdown, recruitmentContactLabel, variant]);

  const handleCopyText = useCallback(() => {
    if (!markdown) return;

    const copy = async () => {
      await navigator.clipboard.writeText(markdown);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    };

    void copy();
  }, [markdown]);

  const handleCopyImage = useCallback(() => {
    if (variant !== "recruitment") return;

    const copy = async () => {
      if (
        typeof window === "undefined" ||
        !("ClipboardItem" in window) ||
        typeof navigator.clipboard?.write !== "function"
      ) {
        return;
      }
      try {
        const res = await fetch("/annonce.png", { cache: "no-store" });
        if (!res.ok) return;
        const blob = await res.blob();
        const item = new ClipboardItem({
          [blob.type || "image/png"]: blob,
        });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2000);
      } catch {
        // Ignore clipboard errors (permissions/browser support).
      }
    };

    void copy();
  }, [variant]);

  const handleShareDiscord = useCallback(() => {
    if (variant !== "effectif") return;

    const send = async () => {
      setSendState("sending");
      setSendError(null);
      try {
        const res = await fetch("/api/discord/effectif/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          const message =
            typeof body?.error === "string" && body.error
              ? body.error
              : res.status === 401
                ? "Non authentifié."
                : res.status === 403
                  ? "Accès réservé au Sheriff de comté et Adjoint."
                  : `Erreur ${res.status}`;
          setSendError(message);
          setSendState("error");
          return;
        }
        setSendState("success");
        setTimeout(() => setSendState("idle"), 3500);
      } catch {
        setSendError("Impossible de contacter le serveur.");
        setSendState("error");
      }
    };

    void send();
  }, [variant]);

  const discordHtml = useMemo(() => discordMarkdownToHtml(markdown), [markdown]);
  const date = data?.date;
  const dateRevisionLabel = useMemo(() => {
    if (!date) return null;
    const [d, m, y] = date.split("/");
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    return dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  }, [date]);

  if (loading) {
    return (
      <section
        className="mt-8 rounded-lg border border-sheriff-gold/25 bg-sheriff-charcoal/40 p-4"
        aria-label="Message effectif Discord"
      >
        <p className="text-sm text-sheriff-paper-muted">
          Chargement du message effectif…
        </p>
      </section>
    );
  }

  const error = data?.error;
  if (error) {
    return (
      <section
        className="mt-8 rounded-lg border border-sheriff-gold/25 bg-sheriff-charcoal/40 p-4"
        aria-label={
          variant === "effectif"
            ? "Message effectif Discord"
            : "Message de recrutement Discord"
        }
      >
        <p className="text-sm text-sheriff-paper-muted">{error}</p>
      </section>
    );
  }

  return (
    <section
      className={`space-y-4 rounded-lg border border-sheriff-gold/25 bg-sheriff-charcoal/40 p-4 ${compact ? "" : "mt-8"}`}
      aria-label={
        variant === "effectif"
          ? "Message effectif Discord"
          : "Message de recrutement Discord"
      }
    >
      <h2 className="font-heading text-lg font-semibold uppercase tracking-wider text-sheriff-gold">
        {variant === "effectif"
          ? "Message effectif Discord"
          : "Message de recrutement Discord"}
      </h2>
      <p className="text-sm text-sheriff-paper-muted">
        {variant === "effectif"
          ? "Effectif a l'instant t, date du jour."
          : "Modele de message pour annoncer le recrutement sur Discord."}
      </p>
      <div className="discord-message-preview rounded-lg border border-[#3f4147] bg-[#2b2d31] p-4 font-sans text-[15px] leading-relaxed text-[#f2f3f5] [&_.discord-h1]:mb-2 [&_.discord-h1]:mt-0 [&_.discord-h1]:text-lg [&_.discord-h1]:font-semibold [&_.discord-h1]:text-[#f2f3f5] [&_.discord-h3]:mb-1 [&_.discord-h3]:mt-3 [&_.discord-h3]:text-base [&_.discord-h3]:font-semibold [&_.discord-h3]:text-[#f2f3f5] [&_.discord-ul]:my-2 [&_.discord-ul]:list-disc [&_.discord-ul]:pl-5 [&_.discord-li]:my-0.5 [&_.discord-p]:my-1 [&_.discord-p]:text-[#b5bac1] [&_.discord-separator]:my-3 [&_.discord-separator]:h-px [&_.discord-separator]:bg-[#4e5058]">
        {variant === "recruitment" && (
          <Image
            src="/annonce.png"
            alt="Annonce de recrutement"
            className="mb-3 mx-auto block w-full max-w-xl rounded-md border border-[#4e5058] object-cover"
            width={1200}
            height={628}
            priority={false}
          />
        )}
        <div dangerouslySetInnerHTML={{ __html: discordHtml }} />
      </div>
      {variant === "effectif" && data?.effectif != null && data?.maxEffectif != null && (
        <p className="text-sm text-sheriff-paper-muted">
          Effectif actuel : {data.effectif} / {data.maxEffectif} postes
          {dateRevisionLabel != null && ` — Dernière révision du registre : ${dateRevisionLabel}`}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCopyText}
          className="sheriff-focus-ring sheriff-btn-save-soft inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
        >
          {copiedText ? "Texte copié" : "Copier le texte"}
        </button>
        {variant === "effectif" && (
          <button
            type="button"
            onClick={handleShareDiscord}
            disabled={sendState === "sending" || !markdown}
            className="sheriff-focus-ring sheriff-btn-secondary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50"
          >
            {sendState === "sending"
              ? "Publication…"
              : sendState === "success"
                ? "Publié sur Discord"
                : "Partager sur Discord"}
          </button>
        )}
        {variant === "recruitment" && (
          <button
            type="button"
            onClick={handleCopyImage}
            className="sheriff-focus-ring sheriff-btn-secondary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
          >
            {copiedImage ? "Image copiée" : "Copier l'image"}
          </button>
        )}
      </div>
      {variant === "effectif" && sendError != null && (
        <p className="text-sm text-red-300" role="alert">
          {sendError}
        </p>
      )}
    </section>
  );
}
