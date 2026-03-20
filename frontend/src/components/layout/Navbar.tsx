"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import { COMTE_ADJOINT_GRADES, isSheriffGrade } from "@/lib/grades";
import { ROUTES } from "@/lib/routes";
import { canAccessDestructionPage, canAccessSaisiesPage } from "@/lib/sheriffAuth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export { ROUTES };

/**
 * Indique si le grade permet d'afficher les liens Référentiel et Comptabilité.
 */
function canSeeReferenceLink(grade: string | null | undefined): boolean {
  return grade != null && COMTE_ADJOINT_GRADES.has(grade);
}

const SHERIFF_ROLES = ["ROLE_SHERIFF_COMTE", "ROLE_SHERIFF_ADJOINT", "ROLE_SHERIFF_EN_CHEF", "ROLE_SHERIFF", "ROLE_SHERIFF_DEPUTY"];
function hasSheriffRole(roles: string[] | null | undefined): boolean {
  return !!roles?.some((r) => SHERIFF_ROLES.includes(r));
}
function canSeeReferenceByRoles(roles: string[] | null | undefined): boolean {
  return !!roles?.some((r) => r === "ROLE_SHERIFF_COMTE" || r === "ROLE_SHERIFF_ADJOINT");
}

const MAIN_LINKS: { href: string; label: string; short?: string; auth?: boolean }[] = [];

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

  const visibleLinks = MAIN_LINKS.filter(
    (link) => !link.auth || status === "authenticated"
  );
  const showReferenceLink = status === "authenticated" && showRefByGradeOrRoles;
  const showComptabiliteLink = status === "authenticated" && showRefByGradeOrRoles;
  const showCoffresLink = status === "authenticated" && showCoffresByGrade;
  /** Lien profil : visible pour tout utilisateur connecté (accès réel contrôlé par la page /profil). */
  const showProfilLink = status === "authenticated";
  const showSaisiesLink = status === "authenticated" && showSaisiesByGradeOrRoles;
  const showDestructionLink = status === "authenticated" && canAccessDestructionPage(grade);

  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  return (
    <header
      className="sticky top-0 z-50 h-16 min-h-[4rem] border-b border-sheriff-gold/40 bg-sheriff-wood/95 sheriff-header-shadow backdrop-blur-sm sm:h-[4.25rem] sm:min-h-[4.25rem]"
      role="banner"
    >
      {/* Skip link — premier élément focusable pour l'accessibilité */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-sheriff-gold focus:px-4 focus:py-2 focus:text-sheriff-ink focus:outline-none focus:ring-2 focus:ring-sheriff-paper"
      >
        Aller au contenu principal
      </a>

      <div className="mx-auto flex h-full min-h-[4rem] max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:min-h-[4.25rem] sm:px-6 lg:px-8 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        {/* Marque */}
        <Link
          href={ROUTES.HOME}
          className="font-heading flex shrink-0 items-center gap-3 rounded-lg py-2 pr-2 text-sheriff-paper no-underline transition-colors duration-200 hover:text-sheriff-gold focus-visible:outline-2 focus-visible:outline-sheriff-gold focus-visible:outline-offset-2 active:text-sheriff-gold/90"
          onClick={() => setMobileOpen(false)}
          aria-label="Bureau du Shérif — Annesburg, accueil"
        >
          {!logoError ? (
            <span className="relative h-9 w-20 shrink-0 sm:h-11 sm:w-24">
              <Image
                src="/logo.png"
                alt=""
                fill
                className="object-contain object-left"
                sizes="96px"
                priority
                onError={() => setLogoError(true)}
              />
            </span>
          ) : null}
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
        {(visibleLinks.length > 0 || showReferenceLink || showComptabiliteLink || showCoffresLink || showSaisiesLink || showDestructionLink) && (
        <nav
          className="hidden shrink-0 items-center gap-1 lg:flex"
          aria-label="Navigation principale"
        >
          {visibleLinks.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              shortLabel={"short" in link ? link.short : undefined}
              isActive={
                link.href === ROUTES.HOME
                  ? pathname === ROUTES.HOME
                  : pathname.startsWith(link.href)
              }
            />
          ))}
          {showSaisiesLink && (
            <NavLink
              href={ROUTES.SAISIES}
              label="Saisies"
              isActive={pathname === ROUTES.SAISIES}
            />
          )}
          {showDestructionLink && (
            <NavLink
              href={ROUTES.DESTRUCTION}
              label="Destruction"
              isActive={pathname === ROUTES.DESTRUCTION}
            />
          )}
          {showCoffresLink && (
            <NavLink
              href={ROUTES.COFFRES}
              label="Coffres"
              isActive={pathname === ROUTES.COFFRES}
            />
          )}
          {showComptabiliteLink && (
            <NavLink
              href={ROUTES.COMPTABILITE}
              label="Comptabilité"
              isActive={pathname === ROUTES.COMPTABILITE}
            />
          )}
          {showReferenceLink && (
            <NavLink
              href={ROUTES.REFERENCE}
              label="Référentiel"
              isActive={pathname === ROUTES.REFERENCE}
            />
          )}
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
              <span className="max-w-[100px] truncate text-sm text-sheriff-paper-muted sm:max-w-[140px]">
                {displayName ?? "Connecté"}
              </span>
            </Link>
          )}
          {session && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: ROUTES.HOME })}
              className="sheriff-focus-ring flex items-center rounded-md border border-sheriff-gold/40 bg-sheriff-gold/15 px-3 py-2 text-sm font-medium text-sheriff-gold transition-all duration-200 hover:bg-sheriff-gold/25 hover:border-sheriff-gold/60 active:scale-[0.98]"
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
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-controls="nav-mobile-menu"
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
        className={`fixed left-0 right-0 top-16 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-sheriff-gold/30 bg-sheriff-wood shadow-xl transition-all duration-300 ease-out sm:top-[4.25rem] sm:max-h-[calc(100vh-4.25rem)] lg:hidden ${
          mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <nav
          className="flex flex-col gap-1 px-4 py-4 pb-6"
          aria-label="Navigation principale (menu)"
        >
          {visibleLinks.length > 0 && visibleLinks.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              isActive={
                link.href === ROUTES.HOME
                  ? pathname === ROUTES.HOME
                  : pathname.startsWith(link.href)
              }
              onClick={() => setMobileOpen(false)}
            />
          ))}
          {showSaisiesLink && (
            <NavLink
              href={ROUTES.SAISIES}
              label="Saisies"
              isActive={pathname === ROUTES.SAISIES}
              onClick={() => setMobileOpen(false)}
            />
          )}
          {showDestructionLink && (
            <NavLink
              href={ROUTES.DESTRUCTION}
              label="Destruction"
              isActive={pathname === ROUTES.DESTRUCTION}
              onClick={() => setMobileOpen(false)}
            />
          )}
          {showCoffresLink && (
            <NavLink
              href={ROUTES.COFFRES}
              label="Coffres"
              isActive={pathname === ROUTES.COFFRES}
              onClick={() => setMobileOpen(false)}
            />
          )}
          {showComptabiliteLink && (
            <NavLink
              href={ROUTES.COMPTABILITE}
              label="Comptabilité"
              isActive={pathname === ROUTES.COMPTABILITE}
              onClick={() => setMobileOpen(false)}
            />
          )}
          {showReferenceLink && (
            <NavLink
              href={ROUTES.REFERENCE}
              label="Référentiel"
              isActive={pathname === ROUTES.REFERENCE}
              onClick={() => setMobileOpen(false)}
            />
          )}
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
                  className="sheriff-focus-ring flex min-h-[48px] items-center gap-3 rounded-lg px-4 py-3 transition-colors duration-200 hover:bg-sheriff-gold/10 active:bg-sheriff-gold/15"
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
                  </span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  signOut({ callbackUrl: ROUTES.HOME });
                }}
                className="sheriff-focus-ring mt-2 flex min-h-[48px] w-full items-center justify-center rounded-lg border border-sheriff-gold/50 bg-sheriff-gold/10 px-4 py-3 text-sm font-medium text-sheriff-gold transition-colors duration-200 hover:bg-sheriff-gold/20 active:scale-[0.98]"
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
