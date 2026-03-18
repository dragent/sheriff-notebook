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
import { referencePutBodySchema } from "@/lib/schemas/reference";

/**
 * Proxie PUT vers le backend /api/reference.
 * Seuls Sheriff de comté et Adjoint peuvent modifier (vérifié côté backend).
 * Spec: docs/PROXY_SPEC.md
 */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(UNAUTHORIZED_JSON, { status: 401 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(BAD_REQUEST_BODY_JSON, { status: 400 });
  }

  const parsed = (() => {
    try {
      return rawBody ? (JSON.parse(rawBody) as unknown) : {};
    } catch {
      return null;
    }
  })();
  const parseResult = referencePutBodySchema.safeParse(parsed);
  if (!parseResult.success) {
    const msg = parseResult.error.errors[0]?.message ?? "Corps de requête invalide";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const token = createBackendJwt(session);
  const context = createProxyContext("api/reference", getUserIdFromSession(session));
  const result = await proxyRequest(context, {
    method: "PUT",
    path: "/api/reference",
    body: JSON.stringify(parseResult.data),
    token,
  });

  return NextResponse.json(result.data, { status: result.status });
}
