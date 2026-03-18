"use client";

type PageIntroBlockProps = {
  /** Titre du bloc (défaut : "Ce que vous pouvez faire ici :") */
  title?: string;
  /** Liste des points à afficher */
  items: string[];
  /** Classes CSS additionnelles (ex. mt-4 mb-6) */
  className?: string;
};

const DEFAULT_TITLE = "Ce que vous pouvez faire ici :";

/**
 * Bloc d'introduction commun aux pages : titre + liste à puces.
 * Chaque page fournit son propre contenu (items).
 */
export function PageIntroBlock({
  title = DEFAULT_TITLE,
  items,
  className = "",
}: PageIntroBlockProps) {
  return (
    <div
      className={`mt-4 mb-6 max-w-2xl space-y-1 text-sm text-sheriff-paper-muted ${className}`.trim()}
    >
      <p className="font-medium text-sheriff-paper">{title}</p>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
