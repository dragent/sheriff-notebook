/** Theme (light/dark): storage key, default, cookie max age. Preference in cookie (SSR) and localStorage (client). */

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "sheriff-theme";
export const DEFAULT_THEME: Theme = "dark";
export const THEME_COOKIE_MAX_AGE = 31536000;
