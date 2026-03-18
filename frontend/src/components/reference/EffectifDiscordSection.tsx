"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { discordMarkdownToHtml } from "@/lib/discordMarkdown";

type EffectifResponse = {
  markdown?: string;
  effectif?: number;
  maxEffectif?: number;
  date?: string;
  error?: string;
};

type EffectifDiscordSectionProps = {
  compact?: boolean;
};

export function EffectifDiscordSection({ compact }: EffectifDiscordSectionProps = {}) {
  const [data, setData] = useState<EffectifResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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
  }, []);

  const handleCopy = useCallback(() => {
    const text = data?.markdown ?? "";
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data?.markdown]);

  const markdown = data?.markdown ?? "";
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
        aria-label="Message effectif Discord"
      >
        <p className="text-sm text-sheriff-paper-muted">{error}</p>
      </section>
    );
  }

  return (
    <section
      className={`space-y-4 rounded-lg border border-sheriff-gold/25 bg-sheriff-charcoal/40 p-4 ${compact ? "" : "mt-8"}`}
      aria-label="Message effectif Discord"
    >
      <h2 className="font-heading text-lg font-semibold uppercase tracking-wider text-sheriff-gold">
        Message effectif Discord
      </h2>
      <p className="text-sm text-sheriff-paper-muted">
        Effectif à l&apos;instant t, date du jour.
      </p>
      <div
        className="discord-message-preview rounded-lg border border-[#3f4147] bg-[#2b2d31] p-4 font-sans text-[15px] leading-relaxed text-[#f2f3f5] [&_.discord-h1]:mb-2 [&_.discord-h1]:mt-0 [&_.discord-h1]:text-lg [&_.discord-h1]:font-semibold [&_.discord-h1]:text-[#f2f3f5] [&_.discord-h3]:mb-1 [&_.discord-h3]:mt-3 [&_.discord-h3]:text-base [&_.discord-h3]:font-semibold [&_.discord-h3]:text-[#f2f3f5] [&_.discord-ul]:my-2 [&_.discord-ul]:list-disc [&_.discord-ul]:pl-5 [&_.discord-li]:my-0.5 [&_.discord-p]:my-1 [&_.discord-p]:text-[#b5bac1]"
        dangerouslySetInnerHTML={{ __html: discordHtml }}
      />
      {data?.effectif != null && data?.maxEffectif != null && (
        <p className="text-sm text-sheriff-paper-muted">
          Effectif actuel : {data.effectif} / {data.maxEffectif} postes
          {dateRevisionLabel != null && ` — Dernière révision du registre : ${dateRevisionLabel}`}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="sheriff-focus-ring inline-flex items-center gap-2 rounded-md border border-sheriff-gold/50 bg-sheriff-charcoal/50 px-4 py-2 text-sm font-medium text-sheriff-gold transition hover:bg-sheriff-gold/10"
        >
          {copied ? "Copié" : "Copier le code md"}
        </button>
      </div>
    </section>
  );
}
