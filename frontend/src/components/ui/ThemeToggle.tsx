"use client";

import { useTheme } from "@/components/ui/ThemeProvider";

const ICON_SIZE = 18;

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

/**
 * Interrupteur thème clair/sombre — accessible (role="switch"), persistance via ThemeProvider.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isLight}
      aria-label={isLight ? "Passer en mode sombre" : "Passer en mode clair"}
      title={isLight ? "Mode clair (actif)" : "Mode sombre (actif)"}
      className="sheriff-focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sheriff-gold/40 bg-sheriff-charcoal/60 text-sheriff-gold transition-colors duration-200 hover:bg-sheriff-gold/15 hover:text-sheriff-gold-hover active:scale-[0.98] lg:h-9 lg:w-9"
    >
      <span className="relative flex items-center justify-center">
        <span
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
            isLight ? "opacity-100" : "opacity-0"
          }`}
        >
          <SunIcon />
        </span>
        <span
          className={`flex items-center justify-center transition-opacity duration-200 ${
            isLight ? "opacity-0" : "opacity-100"
          }`}
        >
          <MoonIcon />
        </span>
      </span>
    </button>
  );
}
