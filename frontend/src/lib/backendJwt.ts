import jwt from "jsonwebtoken";
import type { Session } from "next-auth";
import { trimEnv } from "@/lib/env";

const JWT_EXPIRY_SECONDS = 60 * 60;

export function createBackendJwt(session: Session): string {
  const secret = trimEnv(process.env.BACKEND_JWT_SECRET);
  if (!secret) {
    throw new Error("Missing BACKEND_JWT_SECRET");
  }

  const discordId = session.user?.discordId ?? null;
  const username = session.user?.name ?? null;
  const avatarUrl = session.user?.image ?? null;

  if (!discordId || !username) {
    throw new Error("Invalid session (missing discordId/username)");
  }

  const now = Math.floor(Date.now() / 1000);
  const iss = trimEnv(process.env.BACKEND_JWT_ISS);
  const aud = trimEnv(process.env.BACKEND_JWT_AUD);
  const payload: Record<string, unknown> = {
    sub: discordId,
    username,
    avatarUrl,
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS,
  };
  if (iss) {
    payload.iss = iss;
  }
  if (aud) {
    payload.aud = aud;
  }
  return jwt.sign(payload, secret, { algorithm: "HS256" });
}

