"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Theme } from "@/lib/theme";
import {
  THEME_COOKIE_MAX_AGE,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function persistTheme(value: Theme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, value);
  document.cookie = `${THEME_STORAGE_KEY}=${value}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

type ThemeProviderProps = {
  children: React.ReactNode;
  /** Valeur initiale lue côté serveur (cookie) pour éviter le flash. */
  initialTheme?: Theme | null;
};

/**
 * Fournit le thème (clair/sombre) et la persistance (cookie + localStorage).
 * Le serveur lit le cookie et passe initialTheme ; le client synchronise le DOM.
 */
export function ThemeProvider({
  children,
  initialTheme = null,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return initialTheme ?? DEFAULT_THEME;
  });

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    persistTheme(next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        "content",
        next === "light" ? "#e2dcd2" : "#1b1b1b"
      );
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = theme === "light" ? "#e2dcd2" : "#1b1b1b";
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme doit être utilisé dans un ThemeProvider");
  }
  return ctx;
}
