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
 * Proxie GET vers le backend /api/coffres (inventaire du bureau : munitions + accessoires).
 * Spec: docs/PROXY_SPEC.md
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(UNAUTHORIZED_JSON, { status: 401 });
  }

  const token = createBackendJwt(session);
  const context = createProxyContext("api/coffres", getUserIdFromSession(session));
  const result = await proxyRequest(context, {
    method: "GET",
    path: "/api/coffres",
    token,
  });

  return NextResponse.json(result.data, { status: result.status });
}

/**
 * Proxie PATCH vers le backend /api/coffres (mise à jour d’une quantité inventaire ou accessoire).
 * Spec: docs/PROXY_SPEC.md
 */
export async function PATCH(request: NextRequest) {
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
  const context = createProxyContext("api/coffres", getUserIdFromSession(session));
  const result = await proxyRequest(context, {
    method: "PATCH",
    path: "/api/coffres",
    body: body || "{}",
    token,
  });

  return NextResponse.json(result.data, { status: result.status });
}
