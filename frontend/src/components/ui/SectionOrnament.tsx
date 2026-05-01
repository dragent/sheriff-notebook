import { SheriffStarSvg } from "@/components/ui/SheriffStarSvg";

type Props = {
  /** Visual tone for the star + filets. Defaults to "brass". */
  tone?: "brass" | "gold" | "muted";
  /** Optional className passthrough on the wrapper. */
  className?: string;
  /** Compact mode — thinner filets, smaller star. */
  compact?: boolean;
};

/**
 * Section ornament — filet, sheriff star, filet. Replaces .sheriff-divider
 * where the RP/registry reading is strong (Hero, PageHeader, end-of-Home).
 * Rendered fully decorative (aria-hidden).
 */
export function SectionOrnament({ tone = "brass", className, compact = false }: Props) {
  const filetColorVar =
    tone === "brass"
      ? "var(--sheriff-brass)"
      : tone === "gold"
        ? "var(--sheriff-gold)"
        : "var(--sheriff-paper-muted)";
  const filetHeight = compact ? 1 : 1;
  const starSize = compact ? "sm" : "md";

  return (
    <div
      className={`flex w-full items-center justify-center gap-3 ${className ?? ""}`}
      aria-hidden
    >
      <span
        className="h-px max-w-48 flex-1"
        style={{
          height: `${filetHeight}px`,
          background: `linear-gradient(90deg, transparent, ${filetColorVar} 30%, ${filetColorVar} 100%)`,
          opacity: 0.55,
        }}
      />
      <SheriffStarSvg tone={tone} size={starSize} />
      <span
        className="h-px max-w-48 flex-1"
        style={{
          height: `${filetHeight}px`,
          background: `linear-gradient(270deg, transparent, ${filetColorVar} 30%, ${filetColorVar} 100%)`,
          opacity: 0.55,
        }}
      />
    </div>
  );
}
