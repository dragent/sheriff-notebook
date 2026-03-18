import { Suspense } from "react";

/**
 * Wrapper <main> pour le contenu de page (Server Component).
 * La structure reste dans l'arbre serveur
 * pour éviter les erreurs d'hydratation avec le streaming RSC.
 */
export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      className="flex min-h-0 flex-1 flex-col overflow-x-hidden"
      role="main"
      tabIndex={-1}
    >
      <Suspense fallback={null}>{children}</Suspense>
    </main>
  );
}
