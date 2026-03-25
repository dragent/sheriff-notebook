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

type Params = { params: Promise<{ id: string }> };

/**
 * Proxie PATCH/DELETE vers le backend /api/bureau-weapons/{id}.
 * Spec: docs/PROXY_SPEC.md
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(UNAUTHORIZED_JSON, { status: 401 });
  }

  const { id } = await params;

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json(BAD_REQUEST_BODY_JSON, { status: 400 });
  }

  const token = createBackendJwt(session);
  const context = createProxyContext(`api/bureau-weapons/${id}`, getUserIdFromSession(session));
  const result = await proxyRequest(context, {
    method: "PATCH",
    path: `/api/bureau-weapons/${encodeURIComponent(id)}`,
    body: body || "{}",
    token,
  });

  return NextResponse.json(result.data, { status: result.status });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(UNAUTHORIZED_JSON, { status: 401 });
  }

  const { id } = await params;

  const token = createBackendJwt(session);
  const context = createProxyContext(`api/bureau-weapons/${id}`, getUserIdFromSession(session));
  const result = await proxyRequest(context, {
    method: "DELETE",
    path: `/api/bureau-weapons/${encodeURIComponent(id)}`,
    token,
  });

  return NextResponse.json(result.data, { status: result.status });
}

