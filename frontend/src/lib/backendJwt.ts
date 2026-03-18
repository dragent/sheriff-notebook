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
  return jwt.sign(
    {
      sub: discordId,
      username,
      avatarUrl,
      iat: now,
      exp: now + JWT_EXPIRY_SECONDS,
    },
    secret,
    { algorithm: "HS256" },
  );
}

