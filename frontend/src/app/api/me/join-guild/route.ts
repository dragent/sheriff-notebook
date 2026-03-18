import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createBackendJwt } from "@/lib/backendJwt";
import {
  createProxyContext,
  getUserIdFromSession,
  proxyRequest,
  BAD_REQUEST_BODY_JSON,
  UNAUTHORIZED_JSON,
} from "@/lib/proxyBackend";

/**
 * Proxie POST vers le backend /api/me/join-guild : ajoute l'utilisateur au serveur Discord
 * avec le rôle Deputy si le token OAuth (guilds.join) est présent en session.
 * Spec: docs/PROXY_SPEC.md
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(UNAUTHORIZED_JSON, { status: 401 });
  }

  const accessToken = session.discordAccessToken;
  if (!accessToken || typeof accessToken !== "string") {
    return NextResponse.json(BAD_REQUEST_BODY_JSON, { status: 400 });
  }

  const token = createBackendJwt(session);
  const context = createProxyContext("api/me/join-guild", getUserIdFromSession(session));
  const result = await proxyRequest(context, {
    method: "POST",
    path: "/api/me/join-guild",
    body: JSON.stringify({ accessToken }),
    token,
  });

  return NextResponse.json(result.data, { status: result.status });
}
