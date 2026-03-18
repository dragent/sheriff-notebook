"use client";

import { useSearchParams } from "next/navigation";
import {
  Flashbag,
  getRedirectMessage,
  BACKEND_FLASHBAG_MESSAGES,
} from "@/components/feedback/Flashbag";
import type { BackendFlashbagError } from "@/app/layout";

type UnifiedFlashbagProps = {
  backendError: BackendFlashbagError;
  backendErrorDetail?: string;
};

/**
 * Affiche le détail d'erreur backend (code).
 */
function BackendErrorDetail({ detail }: { detail: string }) {
  return (
    <p className="mt-2 text-sm opacity-90">
      Réponse backend : <code className="sheriff-code-bg rounded px-1">{detail}</code>
    </p>
  );
}

/**
 * Flashbag unifié : erreurs auth (?error=) et backend, affichées sur toutes les pages.
 */
export function UnifiedFlashbag({ backendError, backendErrorDetail }: UnifiedFlashbagProps) {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const messageParam = searchParams.get("message");
  const redirectMessage = getRedirectMessage(errorParam ?? undefined, messageParam ?? undefined);
  const backendMessage = backendError ? BACKEND_FLASHBAG_MESSAGES[backendError] : null;

  const hasRedirect = redirectMessage != null && redirectMessage !== "";
  const hasBackend = backendMessage != null;

  if (!hasRedirect && !hasBackend) return null;

  return (
    <div className="px-4 py-2 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Flashbag id="unified-error" variant="error" className="w-full">
          {hasRedirect && hasBackend ? (
            <>
              <p className="mb-2">{redirectMessage}</p>
              <p className="mt-0">{backendMessage}</p>
              {backendErrorDetail && <BackendErrorDetail detail={backendErrorDetail} />}
            </>
          ) : hasRedirect ? (
            redirectMessage
          ) : (
            <>
              {backendMessage}
              {backendErrorDetail && <BackendErrorDetail detail={backendErrorDetail} />}
            </>
          )}
        </Flashbag>
      </div>
    </div>
  );
}
