/**
 * Module centralisé pour l’appel GET /api/me et la dérivation layout (navbar, flashbag).
 * Utilise le proxy backend pour cohérence avec les routes API Next.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBackendJwt } from "@/lib/backendJwt";
import { createProxyContext, getUserIdFromSession, proxyRequest } from "@/lib/proxyBackend";
import { isSheriffGrade } from "@/lib/grades";
import type {
  BackendMeLayoutResult,
  BackendMePayload,
  MeResponse,
} from "@/types/api";
import { hasSheriffRole } from "@/types/api";

const LAYOUT_RETRIES = 2;
const LAYOUT_RETRY_DELAY_MS = 800;

function parseBackendMePayload(data: BackendMePayload): Pick<
  BackendMeLayoutResult,
  "serverUsername" | "serverGrade" | "serverRoles"
> {
  const roles = Array.isArray(data.roles) ? data.roles : null;
  return {
    serverUsername: typeof data.username === "string" ? data.username : null,
    serverGrade: typeof data.grade === "string" ? data.grade : null,
    serverRoles: roles,
  };
}

export async function getBackendMeForLayout(): Promise<BackendMeLayoutResult> {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    return {
      flashbagError: null,
      serverUsername: null,
      serverGrade: null,
      serverRoles: null,
    };
  }

  if (!session) {
    return {
      flashbagError: null,
      serverUsername: null,
      serverGrade: null,
      serverRoles: null,
    };
  }

  const token = createBackendJwt(session);
  const context = createProxyContext("api/me", getUserIdFromSession(session));

  for (let attempt = 0; attempt <= LAYOUT_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, LAYOUT_RETRY_DELAY_MS));
    }
    try {
      const result = await proxyRequest(context, {
        method: "GET",
        path: "/api/me",
        token,
      });
      const data = result.data as BackendMePayload;

      if (result.ok) {
        const parsed = parseBackendMePayload(data);
        return {
          flashbagError: null,
          ...parsed,
        };
      }

      const backendErrorDetail =
        typeof data.error === "string" ? data.error : undefined;
      const flashbagError: BackendMeLayoutResult["flashbagError"] =
        result.status >= 400 && result.status < 500 ? "unauthorized" : null;

      return {
        flashbagError,
        serverUsername: null,
        serverGrade: null,
        serverRoles: null,
        backendErrorDetail,
      };
    } catch {
    }
  }

  return {
    flashbagError: "network",
    serverUsername: null,
    serverGrade: null,
    serverRoles: null,
  };
}

/**
 * Indique si le profil /api/me correspond à un utilisateur sheriff
 * (grade ou rôle sheriff).
 */
export function isSheriffUser(me: MeResponse | null): boolean {
  if (!me) return false;
  if (isSheriffGrade(me.grade ?? null)) return true;
  return hasSheriffRole(me.roles);
}
