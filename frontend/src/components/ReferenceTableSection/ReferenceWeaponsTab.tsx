"use client";

import type { WeaponEntry } from "@/lib/reference";
import { WeaponsTable } from "./shared";
import type { WeaponKeys } from "./shared";

type Props = {
  weapons: Record<WeaponKeys, WeaponEntry[]>;
};

export function ReferenceWeaponsTab({ weapons }: Props) {
  return (
    <WeaponsTable
      id="armes"
      weapons={{
        fusil: weapons.fusil,
        carabine: weapons.carabine,
        fusilAPompe: weapons.fusilAPompe,
        revolver: weapons.revolver,
        pistolet: weapons.pistolet,
        armeBlanche: weapons.armeBlanche,
      }}
    />
  );
}
