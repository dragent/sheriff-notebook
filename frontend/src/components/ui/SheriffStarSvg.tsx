type Tone = "brass" | "gold" | "muted" | "current";

const TONE_CLASS: Record<Tone, string> = {
  brass: "text-sheriff-brass",
  gold: "text-sheriff-gold",
  muted: "text-sheriff-paper-muted",
  current: "text-current",
};

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<Size, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
  xl: "h-16 w-16",
};

type Props = {
  /** Visual tone — defaults to "brass" since the star is an RP ornament. */
  tone?: Tone;
  /** Tailwind sizing token. Use className override for arbitrary sizes. */
  size?: Size;
  /** Override sizing (overrides size). */
  className?: string;
  /** When true, the inscribing circle is rendered. Defaults to true. */
  withCircle?: boolean;
  /** Decorative by default; pass a label to expose to AT. */
  title?: string;
};

/**
 * Sheriff star — 5-pointed star inscribed in a circle. Used as logo fallback,
 * SectionOrnament centerpiece, favicon source, and decorative accent on
 * registry surfaces. Always rendered with currentColor so it adapts to the
 * surrounding text color when tone="current".
 */
export function SheriffStarSvg({
  tone = "brass",
  size = "md",
  className,
  withCircle = true,
  title,
}: Props) {
  const dimension = className ?? SIZE_CLASS[size];
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={`${dimension} ${TONE_CLASS[tone]}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {withCircle && (
        <circle
          cx="16"
          cy="16"
          r="14.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          opacity="0.65"
        />
      )}
      {/* 5-pointed star, geometrically pure (outer r ~10.5, inner ~4.4) */}
      <path
        d="M16 4.5l2.78 7.13 7.62.42-5.92 4.81 2.05 7.36L16 19.95l-6.53 4.27 2.05-7.36-5.92-4.81 7.62-.42L16 4.5z"
        fill="currentColor"
      />
      {/* Center pin — gives the badge a 3D / engraved feel */}
      <circle cx="16" cy="15.5" r="0.95" fill="var(--sheriff-charcoal)" opacity="0.55" />
    </svg>
  );
}
