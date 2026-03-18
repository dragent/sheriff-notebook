"use client";

import { Flashbag, BACKEND_FLASHBAG_MESSAGES } from "@/components/feedback/Flashbag";
import type { BackendFlashbagError } from "@/app/layout";

type GlobalFlashbagProps = {
  backendError: BackendFlashbagError;
};

/**
 * Affiche l'erreur backend avec les mêmes messages que UnifiedFlashbag.
 */
export function GlobalFlashbag({ backendError }: GlobalFlashbagProps) {
  if (!backendError) return null;

  return (
    <div className="px-4 py-2 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Flashbag id="backend-unreachable" variant="error" className="w-full">
          {BACKEND_FLASHBAG_MESSAGES[backendError]}
        </Flashbag>
      </div>
    </div>
  );
}
