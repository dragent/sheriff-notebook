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
 * Proxie POST vers le backend /api/saisies/stock-adjust (ajustement FIFO du stock saisi). Spec: docs/PROXY_SPEC.md
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
  const context = createProxyContext(
    "api/saisies/stock-adjust",
    getUserIdFromSession(session)
  );
  const result = await proxyRequest(context, {
    method: "POST",
    path: "/api/saisies/stock-adjust",
    body: body || "{}",
    token,
  });

  return NextResponse.json(result.data, { status: result.status });
}

