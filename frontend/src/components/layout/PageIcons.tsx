/**
 * Icônes SVG pour les en-têtes de page (à passer à PageHeader).
 * Taille recommandée : className="h-5 w-5" sur le wrapper ou ici.
 */

const stroke = "currentColor";
const strokeWidth = 1.8;
const strokeLinecap = "round";
const strokeLinejoin = "round";

export const PageIcons = {
  profil: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}>
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  reference: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}>
      <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  destruction: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}>
      <path d="M4 4l16 16M4 20L20 4M4 12h16" />
    </svg>
  ),
  saisies: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}>
      <path d="M5 3h11l3 3v13H5z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h3" />
    </svg>
  ),
  comptabilite: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  coffres: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}>
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
} as const;
