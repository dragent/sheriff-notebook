"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import type { Theme } from "@/lib/theme";

type ProvidersProps = {
  children: React.ReactNode;
  /** Thème initial (lu depuis le cookie côté serveur). */
  initialTheme?: Theme | null;
};

/**
 * Fournit le contexte de session NextAuth et le thème (clair/sombre).
 */
export function Providers({ children, initialTheme = null }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider initialTheme={initialTheme ?? undefined}>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}

