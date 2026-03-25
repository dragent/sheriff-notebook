import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { Cinzel, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { MainContent } from "@/components/layout/MainContent";
import { Navbar } from "@/components/layout/Navbar";
import { JoinGuildGateWithDefaultFallback } from "@/components/auth/JoinGuildGate";
import { UnifiedFlashbag } from "@/components/feedback/UnifiedFlashbag";
import { getBackendMeForLayout } from "@/lib/backendMe";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import type { Theme } from "@/lib/theme";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bureau du Shérif — Annesburg",
  description:
    "Registre officiel du bureau du shérif d'Annesburg. Dossiers, enquêtes et communication intercomté.",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    title: "Bureau du Shérif — Annesburg",
    description:
      "Registre officiel du bureau du shérif d'Annesburg. Dossiers, enquêtes et communication intercomté.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bureau du Shérif — Annesburg",
    description:
      "Registre officiel du bureau du shérif d'Annesburg. Dossiers, enquêtes et communication intercomté.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e2dcd2" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1b1b" },
  ],
};

export const dynamic = "force-dynamic";

/** Erreur backend pour le flashbag (réseau ou 4xx). */
export type BackendFlashbagError = "network" | "unauthorized" | null;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [
    { flashbagError, serverUsername, serverGrade, serverRoles, backendErrorDetail },
    cookieStore,
  ] = await Promise.all([
    getBackendMeForLayout(),
    cookies(),
  ]);

  const themeCookie = cookieStore.get(THEME_STORAGE_KEY)?.value;
  const initialTheme: Theme =
    themeCookie === "light" || themeCookie === "dark" ? themeCookie : "dark";

  return (
    <html
      lang="fr"
      className={`${cinzel.variable} ${sourceSans.variable}`}
      data-theme={initialTheme}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=document.cookie.match(/\\bsheriff-theme=([^;]+)/);var v=t?t[1].trim():'';if(v==='light'||v==='dark'){document.documentElement.setAttribute('data-theme',v);var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=v==='light'?'#e2dcd2':'#1b1b1b';}}());`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <Providers initialTheme={initialTheme}>
          <JoinGuildGateWithDefaultFallback hasServerGrade={!!serverGrade}>
            <Navbar
              serverUsername={serverUsername}
              serverGrade={serverGrade}
              serverRoles={serverRoles}
            />
            <Suspense fallback={null}>
              <UnifiedFlashbag
                backendError={flashbagError}
                backendErrorDetail={backendErrorDetail}
              />
            </Suspense>
            <MainContent>{children}</MainContent>
            <footer className="mt-auto shrink-0 border-t border-sheriff-gold/25 bg-sheriff-charcoal px-4 py-5 sm:px-6 lg:px-8">
              <p
                className="text-center text-xs text-sheriff-paper-muted"
                suppressHydrationWarning
              >
                © {new Date().getFullYear()} Alexis CAU – Bureau du Shérif
                Annesburg. Tous droits réservés.
              </p>
            </footer>
          </JoinGuildGateWithDefaultFallback>
        </Providers>
      </body>
    </html>
  );
}
