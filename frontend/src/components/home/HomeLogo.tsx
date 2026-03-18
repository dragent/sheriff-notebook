"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Logo de la page d'accueil ; fallback étoile si l'image échoue.
 */
export function HomeLogo() {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <span
        className="mb-6 inline-block text-4xl text-sheriff-gold/80 sm:text-5xl"
        aria-hidden
      >
        ★
      </span>
    );
  }

  return (
    <div className="relative mb-6 h-24 w-48 sm:h-32 sm:w-64">
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
