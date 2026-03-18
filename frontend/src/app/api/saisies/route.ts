import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
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
 * Proxie GET vers le backend /api/saisies (liste des saisies). Spec: docs/PROXY_SPEC.md
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(UNAUTHORIZED_JSON, { status: 401 });
  }

  const token = createBackendJwt(session);
  const context = createProxyContext("api/saisies", getUserIdFromSession(session));
  const result = await proxyRequest(context, {
    method: "GET",
    path: "/api/saisies",
    token,
  });

  return NextResponse.json(result.data, { status: result.status });
}

/**
 * Proxie POST vers le backend /api/saisies (création d'une saisie). Spec: docs/PROXY_SPEC.md
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(UNAUTHORIZED_JSON, { status: 401 });
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json(BAD_REQUEST_BODY_JSON, { status: 400 });
  }

  const token = createBackendJwt(session);
  const context = createProxyContext("api/saisies", getUserIdFromSession(session));
  const result = await proxyRequest(context, {
    method: "POST",
    path: "/api/saisies",
    body: body || "{}",
    token,
  });

  return NextResponse.json(result.data, { status: result.status });
}
