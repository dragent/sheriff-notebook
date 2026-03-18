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

const SERVER_ERROR_JSON = { error: "Erreur serveur. Réessayez plus tard." };

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(UNAUTHORIZED_JSON, { status: 401 });
    }

    const token = createBackendJwt(session);
    const context = createProxyContext(
      "api/discord/effectif",
      getUserIdFromSession(session)
    );
    const result = await proxyRequest(context, {
      method: "GET",
      path: "/api/discord/effectif",
      token,
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch {
    return NextResponse.json(SERVER_ERROR_JSON, { status: 500 });
  }
}
