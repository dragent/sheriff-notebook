"use client";

import { useState, useCallback } from "react";

type CopyMarkdownButtonProps = {
  markdown: string;
  className?: string;
};

export function CopyMarkdownButton({ markdown, className = "" }: CopyMarkdownButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!markdown) return;
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [markdown]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
      aria-label={copied ? "Copié" : "Copier le code markdown"}
    >
      {copied ? "Copié" : "Copier le code md"}
    </button>
  );
}
