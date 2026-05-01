import { normalizeSheriffGrade } from "@/lib/grades";

type Size = "xs" | "sm" | "md";

type InsigniaShape = {
  /** Number of 5-pointed stars to render. */
  stars: 0 | 1 | 2 | 3;
  /** Whether to render a chevron (deputy mark) before the stars. */
  chevron: boolean;
};

const GRADE_INSIGNIA: Record<string, InsigniaShape> = {
  "Sheriff de comté": { stars: 3, chevron: false },
  "Sheriff Adjoint": { stars: 2, chevron: false },
  "Sheriff en chef": { stars: 1, chevron: true },
  "Sheriff": { stars: 1, chevron: false },
  "Sheriff Deputy": { stars: 0, chevron: true },
  "Deputy": { stars: 0, chevron: true },
};

const STAR_SIZE: Record<Size, string> = {
  xs: "h-2.5 w-2.5",
  sm: "h-3 w-3",
  md: "h-4 w-4",
};

const TEXT_SIZE: Record<Size, string> = {
  xs: "text-[10px]",
  sm: "text-[11px]",
  md: "text-xs",
};

type Props = {
  grade: string | null | undefined;
  /** Visual size token. Default: "sm". */
  size?: Size;
  /** Hide the textual label and only render the insignia. Default: false. */
  iconOnly?: boolean;
  /** Optional className passthrough on the wrapper. */
  className?: string;
};

function StarGlyph({ sizeClass }: { sizeClass: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`${sizeClass} shrink-0 text-sheriff-brass`}
      aria-hidden
      focusable="false"
    >
      <path
        d="M8 1.6l1.55 3.96 4.25.24-3.3 2.69 1.14 4.11L8 10.55l-3.64 2.05 1.14-4.11-3.3-2.69 4.25-.24L8 1.6z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChevronGlyph({ sizeClass }: { sizeClass: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`${sizeClass} shrink-0 text-sheriff-paper-muted`}
      aria-hidden
      focusable="false"
    >
      <path
        d="M3 5l5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * GradeBadge — pictogram + label for a sheriff grade.
 * Mapping is centralized via GRADE_INSIGNIA and aligned on canonical grade
 * keys returned by normalizeSheriffGrade().
 */
export function GradeBadge({ grade, size = "sm", iconOnly = false, className }: Props) {
  const canonical = normalizeSheriffGrade(grade);
  if (!canonical) {
    return (
      <span className={`text-sheriff-paper-muted ${TEXT_SIZE[size]} ${className ?? ""}`}>
        —
      </span>
    );
  }
  const insignia = GRADE_INSIGNIA[canonical] ?? { stars: 0, chevron: false };
  const starSizeClass = STAR_SIZE[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className ?? ""}`}
      title={canonical}
      aria-label={`Grade : ${canonical}`}
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden>
        {insignia.chevron && <ChevronGlyph sizeClass={starSizeClass} />}
        {Array.from({ length: insignia.stars }).map((_, idx) => (
          <StarGlyph key={idx} sizeClass={starSizeClass} />
        ))}
        {insignia.stars === 0 && !insignia.chevron && (
          <span className="text-sheriff-paper-muted text-xs">·</span>
        )}
      </span>
      {!iconOnly && (
        <span className={`font-heading uppercase tracking-wide text-sheriff-gold ${TEXT_SIZE[size]}`}>
          {canonical}
        </span>
      )}
    </span>
  );
}
