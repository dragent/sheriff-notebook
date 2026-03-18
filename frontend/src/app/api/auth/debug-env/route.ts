import { NextResponse } from "next/server";

/**
 * Masque un secret pour l’affichage (longueur + 2 premiers et 2 derniers caractères).
 */
function maskSecret(s: string): string {
  if (s.length < 4) return s.length > 0 ? "***" : "(vide)";
  return s.slice(0, 2) + "…" + s.slice(-2);
}

/**
 * Diagnostic env (dev only) : présence et longueur des variables Discord et BACKEND_JWT_SECRET.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Disabled outside development" }, { status: 404 });
  }
  const hasId = Boolean(process.env.DISCORD_CLIENT_ID);
  const hasSecret = Boolean(process.env.DISCORD_CLIENT_SECRET);
  const idLength = (process.env.DISCORD_CLIENT_ID ?? "").length;
  const secretLength = (process.env.DISCORD_CLIENT_SECRET ?? "").length;
  const jwtSecret = process.env.BACKEND_JWT_SECRET ?? "";
  return NextResponse.json({
    DISCORD_CLIENT_ID: { set: hasId, length: idLength },
    DISCORD_CLIENT_SECRET: { set: hasSecret, length: secretLength },
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
    BACKEND_JWT_SECRET: {
      length: jwtSecret.length,
      masked: maskSecret(jwtSecret),
      ok: jwtSecret.length >= 32,
    },
  });
}
