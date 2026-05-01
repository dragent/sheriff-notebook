"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import { COMTE_ADJOINT_GRADES, isSheriffGrade } from "@/lib/grades";
import { ROUTES } from "@/lib/routes";
import { canAccessDestructionPage, canAccessSaisiesPage } from "@/lib/sheriffAuth";
import { hasSheriffRole, canSeeReferenceByRoles } from "@/lib/roles";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SheriffStarSvg } from "@/components/ui/SheriffStarSvg";
import { GradeBadge } from "@/components/ui/GradeBadge";

export { ROUTES };

/**
 * Indique si le grade permet d'afficher les liens Référentiel et Comptabilité.
 */
function canSeeReferenceLink(grade: string | null | undefined): boolean {
  return grade != null && COMTE_ADJOINT_GRADES.has(grade);
}

const NAV_LINK_BASE =
  "block shrink-0 rounded-md px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-sheriff-gold focus-visible:outline-offset-2 min-h-[44px] min-w-[44px] flex items-center justify-center lg:min-h-0 lg:min-w-0 lg:justify-start active:scale-[0.98]";
/** Same tokens as dashboard tabs — galvanized pill (dark) / slate pill (light), no heavy bottom bar */
const NAV_LINK_ACTIVE =
  "bg-sheriff-tab-active-bg text-sheriff-tab-active-text shadow-sm ring-1 ring-inset ring-sheriff-gold/18 font-semibold";
const NAV_LINK_INACTIVE =
  "text-sheriff-paper-muted hover:bg-sheriff-gold/10 hover:text-sheriff-paper active:bg-sheriff-gold/15";

/**
 * Lien de navigation avec style actif/inactif.
 */
function NavLink({
  href,
  label,
  isActive,
  onClick,
  shortLabel,
}: {
  href: string;
  label: string;
  shortLabel?: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href ?? "/"}
      onClick={onClick}
      className={`${NAV_LINK_BASE} ${isActive ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}
      aria-current={isActive ? "page" : undefined}
      title={shortLabel && shortLabel !== label ? label : undefined}
    >
      {shortLabel ?? label}
    </Link>
  );
}

/** Spec d'un lien de navigation principal (rendu identique desktop/mobile). */
type NavLinkSpec = {
  key: string;
  href: string;
  label: string;
};

type Visibility = {
  showSaisiesLink: boolean;
  showDestructionLink: boolean;
  showCoffresLink: boolean;
  showComptabiliteLink: boolean;
  showReferenceLink: boolean;
};

/**
 * Construit la liste des liens visibles dans l'ordre canonique
 * (Saisies, Destruction, Coffres, Comptabilité, Référentiel).
 *
 * Source unique de vérité pour les rendus desktop et mobile : éviter de
 * dupliquer la cascade de blocs `{showXxxLink && <NavLink ... />}`.
 */
function getVisibleNavLinks(visibility: Visibility): NavLinkSpec[] {
  const links: NavLinkSpec[] = [];
  if (visibility.showSaisiesLink) {
    links.push({ key: "saisies", href: ROUTES.SAISIES, label: "Saisies" });
  }
  if (visibility.showDestructionLink) {
    links.push({ key: "destruction", href: ROUTES.DESTRUCTION, label: "Destruction" });
  }
  if (visibility.showCoffresLink) {
    links.push({ key: "coffres", href: ROUTES.COFFRES, label: "Coffres" });
  }
  if (visibility.showComptabiliteLink) {
    links.push({ key: "comptabilite", href: ROUTES.COMPTABILITE, label: "Comptabilité" });
  }
  if (visibility.showReferenceLink) {
    links.push({ key: "reference", href: ROUTES.REFERENCE, label: "Référentiel" });
  }
  return links;
}

/**
 * Liste de NavLink dérivée d'un tableau de specs.
 *
 * `onItemClick` est utile pour fermer le menu mobile après navigation ;
 * sur desktop on ne le passe pas.
 */
function NavLinks({
  links,
  pathname,
  onItemClick,
}: {
  links: NavLinkSpec[];
  pathname: string | null;
  onItemClick?: () => void;
}) {
  return (
    <>
      {links.map((link) => (
        <NavLink
          key={link.key}
          href={link.href}
          label={link.label}
          isActive={pathname === link.href}
          onClick={onItemClick}
        />
      ))}
    </>
  );
}

type NavbarProps = {
  /** Username, grade et rôles remontés du layout (un seul appel GET /api/me côté serveur). */
  serverUsername?: string | null;
  serverGrade?: string | null;
  serverRoles?: string[] | null;
};

/**
 * Barre de navigation : liens, utilisateur connecté, menu mobile.
 */
export function Navbar({ serverUsername = null, serverGrade = null, serverRoles = null }: NavbarProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [logoError, setLogoError] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName =
    serverUsername ?? session?.user?.name ?? null;
  const grade = serverGrade;

  const isSheriff = isSheriffGrade(grade) || hasSheriffRole(serverRoles);
  const showRefByGradeOrRoles = canSeeReferenceLink(grade) || canSeeReferenceByRoles(serverRoles);
  const showSaisiesByGradeOrRoles = canAccessSaisiesPage(grade) || isSheriff;
  const showCoffresByGrade =
    grade === "Sheriff en chef" || showRefByGradeOrRoles;

  const showReferenceLink = status === "authenticated" && showRefByGradeOrRoles;
  const showComptabiliteLink = status === "authenticated" && showRefByGradeOrRoles;
  const showCoffresLink = status === "authenticated" && showCoffresByGrade;
  /** Lien profil : visible pour tout utilisateur connecté (accès réel contrôlé par la page /profil). */
  const showProfilLink = status === "authenticated";
  const showSaisiesLink = status === "authenticated" && showSaisiesByGradeOrRoles;
  const showDestructionLink = status === "authenticated" && canAccessDestructionPage(grade);

  const visibleLinks = getVisibleNavLinks({
    showSaisiesLink,
    showDestructionLink,
    showCoffresLink,
    showComptabiliteLink,
    showReferenceLink,
  });
  const hasAnyMainLink = visibleLinks.length > 0;

  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  /** Tracks the previous open state to restore focus on close (skip the initial mount). */
  const wasOpenRef = useRef(false);

  /** Lock background scroll while the mobile menu is open. */
  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  /**
   * Mark the rest of the page as `inert` while the mobile menu is open.
   *
   * `inert` removes everything outside the dialog from the tab order and
   * pointer events, which is the modern equivalent of the old
   * `aria-hidden` + `tabindex=-1` recipe and is honored by both AT and
   * native focus management.
   */
  useEffect(() => {
    if (!mobileOpen) return;
    const header = headerRef.current;
    const siblings = Array.from(document.body.children).filter(
      (el) => el !== header,
    );
    for (const el of siblings) {
      el.setAttribute("inert", "");
      el.setAttribute("aria-hidden", "true");
    }
    return () => {
      for (const el of siblings) {
        el.removeAttribute("inert");
        el.removeAttribute("aria-hidden");
      }
    };
  }, [mobileOpen]);

  /**
   * Keyboard a11y while the mobile menu is open:
   * - `Escape` closes the menu
   * - `Tab` / `Shift+Tab` are trapped inside the menu (cycle on the edges)
   *
   * Also focuses the first interactive element when the menu opens, so
   * keyboard users land somewhere meaningful.
   */
  useEffect(() => {
    if (!mobileOpen) return;
    const menuEl: HTMLDivElement | null = mobileMenuRef.current;
    if (!menuEl) return;
    /** Captured non-null alias — keeps TypeScript narrowing inside the
     *  keydown closure (nested functions otherwise widen the ref type). */
    const trapEl: HTMLDivElement = menuEl;

    const FOCUSABLE_SELECTOR =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

    const queueFocus = window.requestAnimationFrame(() => {
      const first = trapEl.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(
        trapEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || !trapEl.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(queueFocus);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  /** Restore focus to the hamburger button when the menu closes. */
  useEffect(() => {
    if (wasOpenRef.current && !mobileOpen) {
      hamburgerRef.current?.focus();
    }
    wasOpenRef.current = mobileOpen;
  }, [mobileOpen]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 h-16 min-h-16 border-b border-sheriff-gold/40 bg-sheriff-wood/95 sheriff-header-shadow backdrop-blur-sm sm:h-17 sm:min-h-17"
      role="banner"
    >
      {/* Skip link — premier élément focusable pour l'accessibilité */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-sheriff-gold focus:px-4 focus:py-2 focus:text-sheriff-ink focus:outline-none focus:ring-2 focus:ring-sheriff-paper"
      >
        Aller au contenu principal
      </a>

      <div className="mx-auto flex h-full min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:min-h-17 sm:px-6 lg:px-8 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        {/* Marque */}
        <Link
          href={ROUTES.HOME}
          className="font-heading flex shrink-0 items-center gap-3 rounded-lg py-2 pr-2 text-sheriff-paper no-underline transition-colors duration-200 hover:text-sheriff-gold focus-visible:outline-2 focus-visible:outline-sheriff-gold focus-visible:outline-offset-2 active:text-sheriff-gold/90"
          onClick={() => setMobileOpen(false)}
          aria-label="Bureau du Shérif — Annesburg, accueil"
        >
          {!logoError ? (
            <span className="relative h-7 w-7 shrink-0 sm:h-8 sm:w-8">
              <Image
                src="/logo.png"
                alt=""
                fill
                className="object-contain"
                sizes="32px"
                priority
                onError={() => setLogoError(true)}
              />
            </span>
          ) : (
            <SheriffStarSvg tone="brass" className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
          )}
          <span
            className={
              logoError
                ? "text-base tracking-wide sm:text-lg"
                : "hidden text-base tracking-wide sm:inline sm:text-lg"
            }
          >
            Bureau du Shérif — Annesburg
          </span>
        </Link>

        {/* Navigation desktop */}
        {hasAnyMainLink && (
          <nav
            className="hidden shrink-0 items-center gap-1 lg:flex"
            aria-label="Navigation principale"
          >
            <NavLinks links={visibleLinks} pathname={pathname} />
          </nav>
        )}

        {/* Bloc thème + utilisateur + CTA desktop */}
        <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-sheriff-gold/25 bg-sheriff-charcoal/50 pl-2 pr-2 py-2 lg:flex">
          <ThemeToggle />
          {status === "authenticated" && session?.user && showProfilLink && (
            <Link
              href={ROUTES.PROFIL}
              className="sheriff-focus-ring flex items-center gap-2 rounded-md border border-transparent bg-transparent pl-1.5 pr-2.5 py-2 transition-all duration-200 hover:bg-sheriff-gold/10 hover:text-sheriff-paper active:scale-[0.98]"
              title="Modifier mes informations (télégramme, armes, calèche)"
              aria-label="Mon profil"
            >
              {session.user.image ? (
                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-sheriff-gold/40">
                  <Image
                    src={session.user.image}
                    alt=""
                    width={28}
                    height={28}
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sheriff-gold/20 text-xs font-medium text-sheriff-gold">
                  {(displayName ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span className="max-w-[100px] truncate text-sm text-sheriff-paper-muted sm:max-w-[140px]">
                  {displayName ?? "Connecté"}
                </span>
                {grade && (
                  <GradeBadge grade={grade} size="xs" className="-mt-0.5" />
                )}
              </span>
            </Link>
          )}
          {session && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: ROUTES.HOME })}
              className="sheriff-focus-ring sheriff-btn-secondary flex items-center rounded-md px-3 py-2 text-sm font-medium active:scale-[0.98]"
              aria-label="Se déconnecter"
            >
              Déconnexion
            </button>
          )}
        </div>

        {/* Hamburger + thème mobile / tablette */}
        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <ThemeToggle />
          {status === "authenticated" && displayName && (
            <span className="max-w-[80px] truncate text-xs text-sheriff-paper-muted sm:max-w-[100px]" aria-hidden>
              {displayName}
            </span>
          )}
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-controls="nav-mobile-menu"
            aria-haspopup="dialog"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="sheriff-focus-ring flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-sheriff-gold/40 bg-sheriff-charcoal/60 text-sheriff-gold transition-all duration-200 hover:bg-sheriff-gold/15 active:bg-sheriff-gold/20"
          >
            <span className="relative h-5 w-5" aria-hidden>
              <span
                className={`absolute left-0 top-[4px] h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${
                  mobileOpen ? "top-[9px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[9px] h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${
                  mobileOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${
                  mobileOpen ? "top-[9px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Overlay mobile (clic dehors = fermer) */}
      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
          tabIndex={-1}
        />
      )}

      {/* Menu mobile */}
      <div
        ref={mobileMenuRef}
        id="nav-mobile-menu"
        className={`fixed left-0 right-0 top-16 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-sheriff-gold/30 bg-sheriff-wood shadow-xl transition-all duration-300 ease-out sm:top-17 sm:max-h-[calc(100vh-4.25rem)] lg:hidden ${
          mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal={mobileOpen}
        aria-label="Menu de navigation"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <nav
          className="flex flex-col gap-1 px-4 py-4 pb-6"
          aria-label="Navigation principale (menu)"
        >
          <NavLinks
            links={visibleLinks}
            pathname={pathname}
            onItemClick={() => setMobileOpen(false)}
          />
          <div className="mt-3 flex items-center gap-2 border-t border-sheriff-gold/30 pt-3">
            <span className="text-sm text-sheriff-paper-muted">Thème</span>
            <ThemeToggle />
          </div>
          {session && (
            <div className="flex flex-col gap-2 pt-2">
              {session?.user && showProfilLink && (
                <Link
                  href={ROUTES.PROFIL}
                  onClick={() => setMobileOpen(false)}
                  className="sheriff-focus-ring flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 transition-colors duration-200 hover:bg-sheriff-gold/10 active:bg-sheriff-gold/15"
                  title="Modifier mes informations (télégramme, armes, calèche)"
                  aria-label="Mon profil"
                >
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded-full border border-sheriff-gold/40"
                    />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sheriff-gold/20 text-sm font-medium text-sheriff-gold">
                      {(displayName ?? "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="flex flex-col items-start">
                    <span className="text-sm font-medium text-sheriff-paper">
                      Mon profil
                    </span>
                    <span className="text-xs text-sheriff-paper-muted">
                      {displayName ?? "Connecté"}
                    </span>
                    {grade && (
                      <GradeBadge grade={grade} size="xs" className="mt-1" />
                    )}
                  </span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  signOut({ callbackUrl: ROUTES.HOME });
                }}
                className="sheriff-focus-ring sheriff-btn-secondary mt-2 flex min-h-12 w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium active:scale-[0.98]"
                aria-label="Se déconnecter"
              >
                Déconnexion
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
