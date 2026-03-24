"use client";

import { EffectifDiscordSection } from "@/components/reference/EffectifDiscordSection";

type ReferenceDiscordMessageTabProps = {
  variant: "effectif" | "recruitment";
};

export function ReferenceDiscordMessageTab({ variant }: ReferenceDiscordMessageTabProps) {
  return <EffectifDiscordSection compact variant={variant} />;
}
