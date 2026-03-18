"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type JoinStatus = "idle" | "pending" | "done";

/**
 * Affiche le fallback (écran d'attente) tant que l'utilisateur connecté avec discordAccessToken
 * n'a pas été ajouté au serveur Discord et n'a pas reçu le grade. Une fois l'appel join-guild
 * terminé, affiche les enfants (index / contenu principal).
 */
export function JoinGuildGate({
  children,
  fallback,
  hasServerGrade = false,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
  hasServerGrade?: boolean;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");

  const mustWaitForJoin =
    status === "authenticated" &&
    !!session?.discordAccessToken &&
    !hasServerGrade &&
    joinStatus !== "done";

  useEffect(() => {
    if (status !== "authenticated" || !session?.discordAccessToken) return;
    if (joinStatus !== "idle") return;

    // Defer state update to avoid sync setState inside effect body.
    queueMicrotask(() => setJoinStatus("pending"));
    fetch("/api/me/join-guild", { method: "POST" })
      .then((res) => {
        setJoinStatus("done");
        if (res.ok) router.refresh();
      })
      .catch(() => setJoinStatus("done"));
  }, [status, session?.discordAccessToken, joinStatus, router]);

  if (mustWaitForJoin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

function JoinGuildLoadingScreen() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-sheriff-charcoal text-sheriff-paper"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-sheriff-gold border-t-transparent"
        aria-hidden
      />
      <p className="font-body text-sm text-sheriff-paper-muted">
        Ajout au serveur en cours…
      </p>
      <p className="text-xs text-sheriff-paper-muted opacity-80">
        Attribution de ton rôle sur le serveur
      </p>
    </div>
  );
}

/**
 * Variante qui affiche un écran de chargement par défaut pendant l'ajout au serveur.
 */
export function JoinGuildGateWithDefaultFallback({
  children,
  hasServerGrade = false,
}: {
  children: React.ReactNode;
  hasServerGrade?: boolean;
}) {
  return (
    <JoinGuildGate
      fallback={<JoinGuildLoadingScreen />}
      hasServerGrade={hasServerGrade}
    >
      {children}
    </JoinGuildGate>
  );
}
