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
 * Proxie vers le backend GET /api/recruits (liste des membres sans rôle sheriff).
 * Spec: docs/PROXY_SPEC.md
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(UNAUTHORIZED_JSON, { status: 401 });
  }

  const token = createBackendJwt(session);
  const context = createProxyContext("api/recruits", getUserIdFromSession(session));
  const result = await proxyRequest(context, {
    method: "GET",
    path: "/api/recruits",
    token,
  });

  return NextResponse.json(result.data, { status: result.status });
}
