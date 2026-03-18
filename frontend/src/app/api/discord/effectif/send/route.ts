import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createBackendJwt } from "@/lib/backendJwt";
import {
  createProxyContext,
  getUserIdFromSession,
  proxyRequest,
  UNAUTHORIZED_JSON,
} from "@/lib/proxyBackend";

/**
 * Proxie POST vers le backend /api/discord/effectif/send (publication du message effectif sur Discord).
 * Accès réservé Sheriff de comté / Adjoint. Spec: docs/PROXY_SPEC.md
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(UNAUTHORIZED_JSON, { status: 401 });
  }

  const token = createBackendJwt(session);
  const context = createProxyContext(
    "api/discord/effectif/send",
    getUserIdFromSession(session)
  );
  const result = await proxyRequest(context, {
    method: "POST",
    path: "/api/discord/effectif/send",
    body: "{}",
    token,
  });

  return NextResponse.json(result.data, { status: result.status });
}
