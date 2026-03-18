/**
 * Middleware Next.js : protection des routes et masquage du debug en prod.
 * - Routes protégées (profil, reference, comptabilité, coffres, saisies, destruction) :
 *   redirection vers l’accueil si non authentifié.
 * - En production : /debug/* renvoie vers l’accueil (page désactivée côté page aussi).
 */

import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = [
  "/profil",
  "/reference",
  "/comptabilite",
  "/coffres",
  "/saisies",
  "/destruction",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // En production : ne pas exposer /debug (JWT, config)
  if (process.env.NODE_ENV === "production" && pathname.startsWith("/debug")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const home = new URL("/", request.url);
    home.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profil",
    "/profil/:path*",
    "/reference",
    "/reference/:path*",
    "/comptabilite",
    "/comptabilite/:path*",
    "/coffres",
    "/coffres/:path*",
    "/saisies",
    "/saisies/:path*",
    "/destruction",
    "/destruction/:path*",
    "/debug",
    "/debug/:path*",
  ],
};
