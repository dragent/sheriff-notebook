import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { getBackendBase } from "@/lib/proxyBackend";

export const metadata: Metadata = {
  title: "Diagnostic — backend, JWT, Discord",
  robots: "noindex, nofollow",
};

/**
 * Masque un secret pour l’affichage (2 premiers + 2 derniers caractères).
 */
function mask(s: string): string {
  if (s.length < 4) return s.length > 0 ? "***" : "(vide)";
  return s.slice(0, 2) + "…" + s.slice(-2);
}

/**
 * Récupère les infos BACKEND_JWT_SECRET côté backend (route debug).
 */
async function getBackendJwtInfo(): Promise<{
  length: number;
  masked: string;
  ok: boolean;
  error?: string;
} | null> {
  const base = getBackendBase();
  try {
    const res = await fetch(`${base}/api/debug/jwt-secret`, { cache: "no-store" });
    if (!res.ok) return { length: 0, masked: "(erreur)", ok: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { BACKEND_JWT_SECRET?: { length: number; masked: string; ok: boolean } };
    const secret = data.BACKEND_JWT_SECRET;
    if (!secret) return null;
    return { length: secret.length, masked: secret.masked, ok: secret.ok };
  } catch (e) {
    return {
      length: 0,
      masked: "(injoignable)",
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Vérifie que le backend répond (health check).
 */
async function getBackendHealth(): Promise<{ ok: boolean; error?: string }> {
  const base = getBackendBase();
  try {
    const res = await fetch(`${base}/api/health`, { cache: "no-store" });
    const data = (await res.json()) as { ok?: boolean };
    return { ok: res.ok && data.ok === true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Vérifie la connexion Discord (bot + serveur) — disponible uniquement en dev côté backend.
 */
async function getBackendDiscordDebug(): Promise<{
  connected: boolean;
  guildName: string | null;
  message: string;
  unavailable?: boolean;
} | null> {
  const base = getBackendBase();
  try {
    const res = await fetch(`${base}/api/debug/discord`, { cache: "no-store" });
    if (res.status === 404) return { connected: false, guildName: null, message: "Route debug Discord désactivée (env prod).", unavailable: true };
    if (!res.ok) return { connected: false, guildName: null, message: `HTTP ${res.status}` };
    const data = (await res.json()) as { connected?: boolean; guildName?: string | null; message?: string };
    return {
      connected: data.connected === true,
      guildName: data.guildName ?? null,
      message: typeof data.message === "string" ? data.message : "—",
    };
  } catch (e) {
    return { connected: false, guildName: null, message: e instanceof Error ? e.message : String(e), unavailable: true };
  }
}

/**
 * Page de diagnostic : backend, JWT et Discord (pseudo serveur).
 * Désactivée en production pour ne pas exposer d’infos sur la config (même masquées).
 */
export default async function DebugJwtPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const frontendSecret = process.env.BACKEND_JWT_SECRET ?? "";
  const frontend = {
    length: frontendSecret.length,
    masked: mask(frontendSecret),
    ok: frontendSecret.length >= 32,
  };
  const [backend, health, discord] = await Promise.all([
    getBackendJwtInfo(),
    getBackendHealth(),
    getBackendDiscordDebug(),
  ]);
  const match = backend ? frontend.length === backend.length && frontend.masked === backend.masked : false;

  return (
    <div
      className="sheriff-paper-bg flex min-h-[60vh] flex-1 flex-col"
      aria-label="Diagnostic — backend, JWT, Discord"
    >
      <section className="page-container flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-2xl space-y-6">
        <Link
          href={ROUTES.HOME}
          className="sheriff-focus-ring inline-flex items-center gap-1.5 text-sm text-sheriff-paper-muted transition hover:text-sheriff-gold"
        >
          <span aria-hidden>←</span>
          Accueil
        </Link>
        <header>
          <h1 className="font-heading mt-2 text-2xl font-semibold text-sheriff-gold sm:text-3xl">
            Diagnostic — connexion et config
          </h1>
          <p className="mt-2 text-sm text-sheriff-paper-muted">
            Vérification du backend, du secret JWT et de l’accès Discord (pseudo serveur). Les secrets ne sont jamais affichés en clair.
          </p>
        </header>

        <section className="sheriff-card space-y-2 rounded-lg border border-sheriff-gold/30 bg-sheriff-charcoal/40 p-4">
          <h2 className="font-heading font-semibold text-sheriff-gold">Backend (réponse)</h2>
          <p className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={health.ok}
              readOnly
              disabled
              aria-label="Backend répond correctement"
              className="sheriff-checkbox pointer-events-none"
            />
            {health.ok ? (
              <span className="text-green-400">Le backend répond correctement (<code className="rounded bg-black/20 px-1">/api/health</code>).</span>
            ) : (
              <span className="text-red-400">
                Le backend est injoignable ou a renvoyé une erreur. Vérifie qu’il tourne et que <code className="rounded bg-black/20 px-1">BACKEND_BASE_URL</code> est correct. {health.error && <span className="block mt-1 text-sm">({health.error})</span>}
              </span>
            )}
          </p>
        </section>

        <section className="sheriff-card space-y-2 rounded-lg border border-sheriff-gold/30 bg-sheriff-charcoal/40 p-4">
          <h2 className="font-heading font-semibold text-sheriff-gold">Discord (pseudo serveur)</h2>
          {discord?.unavailable ? (
            <p className="flex items-center gap-2 text-sheriff-paper-muted text-sm">
              <input type="checkbox" checked={false} readOnly disabled aria-label="Discord non vérifié" className="sheriff-checkbox pointer-events-none" />
              {discord.message}
            </p>
          ) : discord ? (
            <p className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={discord.connected}
                readOnly
                disabled
                aria-label="Discord connecté"
                className="sheriff-checkbox pointer-events-none"
              />
              {discord.connected ? (
                <span className="text-green-400">
                  Le backend peut accéder au serveur Discord. Serveur : <strong>{discord.guildName ?? "—"}</strong>. Les nicknames du serveur seront utilisés pour l’affichage.
                </span>
              ) : (
                <span className="text-red-400">
                  {discord.message} Vérifie <code className="rounded bg-black/20 px-1">DISCORD_GUILD_ID</code>, <code className="rounded bg-black/20 px-1">DISCORD_BOT_TOKEN</code> et l’intent « Server Members » (portail Discord).
                </span>
              )}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sheriff-paper-muted text-sm">
              <input type="checkbox" checked={false} readOnly disabled aria-label="Discord injoignable" className="sheriff-checkbox pointer-events-none" />
              Impossible de contacter la route debug Discord.
            </p>
          )}
        </section>

        <section className="sheriff-card space-y-2 rounded-lg border border-sheriff-gold/30 bg-sheriff-charcoal/40 p-4">
          <h2 className="font-heading font-semibold text-sheriff-gold">Secret JWT — Frontend (Next.js)</h2>
          <ul className="font-mono text-sm">
            <li>Longueur : <strong>{frontend.length}</strong></li>
            <li>Aperçu : <strong>{frontend.masked}</strong></li>
            <li className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={frontend.ok}
                readOnly
                disabled
                aria-label="Secret JWT frontend OK (≥ 32 caractères)"
                className="sheriff-checkbox pointer-events-none"
              />
              OK (≥ 32) : {frontend.ok ? "oui" : "non"}
            </li>
          </ul>
        </section>

        <section className="sheriff-card space-y-2 rounded-lg border border-sheriff-gold/30 bg-sheriff-charcoal/40 p-4">
          <h2 className="font-heading font-semibold text-sheriff-gold">Secret JWT — Backend (Symfony)</h2>
          {backend ? (
            <ul className="font-mono text-sm">
              <li>Longueur : <strong>{backend.length}</strong></li>
              <li>Aperçu : <strong>{backend.masked}</strong></li>
              <li className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={backend.ok}
                  readOnly
                  disabled
                  aria-label="Secret JWT backend OK (≥ 32 caractères)"
                  className="sheriff-checkbox pointer-events-none"
                />
                OK (≥ 32) : {backend.ok ? "oui" : "non"}
              </li>
              {backend.error && <li className="text-red-400">Erreur : {backend.error}</li>}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-sm text-sheriff-paper-muted">
              <input type="checkbox" checked={false} readOnly disabled aria-label="Backend JWT non disponible" className="sheriff-checkbox pointer-events-none" />
              Réponse backend invalide.
            </p>
          )}
        </section>

        <section className="sheriff-card rounded-lg border border-sheriff-gold/30 bg-sheriff-charcoal/40 p-4">
          <h2 className="font-heading mb-2 font-semibold text-sheriff-gold">Verdict JWT</h2>
          {backend ? (
            <p className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={match}
                readOnly
                disabled
                aria-label="Secrets JWT frontend et backend identiques"
                className="sheriff-checkbox pointer-events-none"
              />
              {match ? (
                <span className="text-green-400">
                  Les deux côtés utilisent le même secret (longueur et aperçu identiques).
                </span>
              ) : (
                <span className="text-red-400">
                  Frontend et backend ne sont pas alignés (longueur ou valeur différente). Vérifie
                  BACKEND_JWT_SECRET dans .env / .env.local et docker-compose, puis redémarre.
                </span>
              )}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sheriff-gold">
              <input type="checkbox" checked={false} readOnly disabled aria-label="Comparaison impossible" className="sheriff-checkbox pointer-events-none" />
              Impossible de comparer : le backend est injoignable ou la route debug n&apos;a pas répondu.
            </p>
          )}
        </section>
        </div>
      </section>
    </div>
  );
}
