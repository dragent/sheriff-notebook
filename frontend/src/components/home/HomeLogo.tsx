"use client";

import { useState } from "react";
import Image from "next/image";
import { SheriffStarSvg } from "@/components/ui/SheriffStarSvg";

/**
 * Logo de la page d'accueil ; fallback étoile (SVG) si l'image échoue.
 */
export function HomeLogo() {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <SheriffStarSvg
        tone="brass"
        className="mb-2 h-16 w-16 sm:h-20 sm:w-20"
      />
    );
  }

  return (
    <div className="relative mb-2 h-24 w-48 sm:h-32 sm:w-64">
      <Image
        src="/logo.png"
        alt=""
        fill
        className="object-contain"
        sizes="(max-width: 640px) 192px, 256px"
        priority
        onError={() => setError(true)}
      />
    </div>
  );
}
