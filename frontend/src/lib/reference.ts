/** Shared county reference logic (weapons, items). No "use client" so it can run on server and client. */

export type ReferenceItem = {
  name: string;
  destructionValue?: string;
};

export type ItemCategory = {
  id: string;
  name: string;
  items: ReferenceItem[];
};

export type HomeInfo = {
  id: string;
  title: string;
  content: string;
  order?: number;
};

export type HomeInfoCategory = {
  id: string;
  name: string;
  order?: number;
  infos: HomeInfo[];
};

/** (créées par l’x). */
export type FormationCatalogItem = {
  id: string;
  label: string;
};

export type FormationGradeConfig = {
  grade: string;
  formationIds: string[];
};

export type WeaponEntry = {
  name: string;
  destructionValue?: string;
};

export type ReferenceData = {
  fusil: WeaponEntry[];
  carabine: WeaponEntry[];
  fusilAPompe: WeaponEntry[];
  revolver: WeaponEntry[];
  pistolet: WeaponEntry[];
  armeBlanche: WeaponEntry[];
  itemCategories: ItemCategory[];
  contraventions: { label: string; amende: string; prisonTime: string }[];
  homeInfoCategories: HomeInfoCategory[];
  formations: FormationCatalogItem[];
  formationsByGrade: FormationGradeConfig[];
};

export function normalizeReferenceData(
  data: Record<string, unknown>
): ReferenceData {
  const emptyWeapon: WeaponEntry[] = [];
  const rawCategories = data.itemCategories as ItemCategory[] | undefined;
  let itemCategories: ItemCategory[];

  if (Array.isArray(rawCategories) && rawCategories.length > 0) {
    itemCategories = rawCategories.map((c, index) => ({
      id: c.id ?? `cat-${index}`,
      name: typeof c.name === "string" ? c.name : "Catégorie",
      items: Array.isArray(c?.items) ? c.items : [],
    }));
  } else {
    let items = (data.items as ReferenceItem[] | undefined) ?? [];
    const oldDestruction = data.destruction as
      | { name: string; value: string }[]
      | undefined;
    if (
      oldDestruction?.length &&
      !items.some((i) => i.destructionValue != null && i.destructionValue !== "")
    ) {
      const byName = new Map(oldDestruction.map((d) => [d.name, d.value]));
      items = items.map((i) => ({
        ...i,
        destructionValue: byName.get(i.name) ?? i.destructionValue,
      }));
    }
    itemCategories = items.length
      ? [{ id: "default", name: "Items", items }]
      : [];
  }

  const rawHome = data.homeInfoCategories as HomeInfoCategory[] | undefined;
  let homeInfoCategories: HomeInfoCategory[] = [];
  if (Array.isArray(rawHome) && rawHome.length > 0) {
    homeInfoCategories = rawHome.map((c, catIndex) => ({
      id: c.id ?? `homecat-${catIndex}`,
      name: typeof c.name === "string" ? c.name : "Catégorie",
      order: typeof c.order === "number" ? c.order : undefined,
      infos: Array.isArray(c.infos)
        ? c.infos.map((i, infoIndex) => ({
            id: i.id ?? `homeinfo-${catIndex}-${infoIndex}`,
            title: typeof i.title === "string" ? i.title : "",
            content: typeof i.content === "string" ? i.content : "",
            order: typeof i.order === "number" ? i.order : undefined,
          }))
        : [],
    }));
  }

  const rawFormations = data.formations as FormationCatalogItem[] | undefined;
  let formations: FormationCatalogItem[] = [];
  if (Array.isArray(rawFormations) && rawFormations.length > 0) {
    formations = rawFormations
      .map((f, i) => {
        const id = typeof f.id === "string" && f.id.trim() !== "" ? f.id : `formation-${i}`;
        const label = typeof f.label === "string" ? f.label.trim() : "";
        return { id, label };
      })
      .filter((f) => f.id !== "");
  }

  const rawFormationsByGrade = data.formationsByGrade as Array<{ grade: string; formationIds?: string[]; keys?: string[] }> | undefined;
  let formationsByGrade: FormationGradeConfig[] = [];
  if (Array.isArray(rawFormationsByGrade) && rawFormationsByGrade.length > 0) {
    formationsByGrade = rawFormationsByGrade
      .map((cfg) => {
        const grade = typeof cfg.grade === "string" ? cfg.grade : "";
        const ids = Array.isArray(cfg.formationIds) ? cfg.formationIds : Array.isArray(cfg.keys) ? cfg.keys : [];
        const formationIds = ids.filter(
          (k): k is string => typeof k === "string" && k.trim() !== ""
        );
        if (!grade) return null;
        return {
          grade,
          formationIds: Array.from(new Set(formationIds)),
        };
      })
      .filter((cfg): cfg is FormationGradeConfig => cfg !== null);
  }

  function toWeaponEntries(arr: unknown, fallback: unknown = []): WeaponEntry[] {
    const raw = Array.isArray(arr) ? arr : fallback;
    if (!Array.isArray(raw)) return [];
    return raw.map((el) => {
      if (typeof el === "string") return { name: el.trim(), destructionValue: undefined };
      if (el && typeof el === "object" && "name" in el && typeof (el as { name: unknown }).name === "string") {
        const o = el as { name: string; destructionValue?: string };
        return { name: o.name.trim(), destructionValue: typeof o.destructionValue === "string" ? o.destructionValue : undefined };
      }
      return { name: "", destructionValue: undefined };
    }).filter((e) => e.name !== "");
  }

  return {
    fusil: toWeaponEntries(data.fusil, emptyWeapon),
    carabine: toWeaponEntries(data.carabine, data.carabines ?? emptyWeapon),
    fusilAPompe: toWeaponEntries(data.fusilAPompe, emptyWeapon),
    revolver: toWeaponEntries(data.revolver, data.revolvers ?? emptyWeapon),
    pistolet: toWeaponEntries(data.pistolet, emptyWeapon),
    armeBlanche: toWeaponEntries(data.armeBlanche, data.armes ?? emptyWeapon),
    itemCategories,
    contraventions:
      (data.contraventions as ReferenceData["contraventions"]) ?? [],
    homeInfoCategories,
    formations,
    formationsByGrade,
  };
}

export const WEAPON_CATEGORIES = [
  { key: "armeBlanche", label: "Arme blanche" },
  { key: "carabine", label: "Carabine" },
  { key: "fusil", label: "Fusil" },
  { key: "fusilAPompe", label: "Fusil à pompe" },
  { key: "pistolet", label: "Pistolet" },
  { key: "revolver", label: "Revolver" },
] as const;

export type WeaponCategoryKey = (typeof WEAPON_CATEGORIES)[number]["key"];

const WEAPON_CATEGORIES_FOR_SELECTS = WEAPON_CATEGORIES.filter(
  (c) => c.key !== "armeBlanche"
);

export type WeaponCategoryOption = {
  label: string;
  weapons: string[];
};

/**
 * Armes du référentiel groupées par catégorie (pour selects avec optgroup). Exclut les armes blanches.
 */
export function getWeaponsByCategory(data: ReferenceData): WeaponCategoryOption[] {
  return WEAPON_CATEGORIES_FOR_SELECTS.map(({ key, label }) => ({
    label,
    weapons: [...(data[key] ?? [])].map((e) => e.name).filter(Boolean).sort((a, b) => a.localeCompare(b, "fr")),
  })).filter((cat) => cat.weapons.length > 0);
}

/**
 * Liste unique et triée de tous les noms d’armes du référentiel pour les selects (armes blanches exclues).
 */
export function getAllWeaponNames(data: ReferenceData): string[] {
  const names = [
    ...(data.fusil ?? []).map((e) => e.name),
    ...(data.carabine ?? []).map((e) => e.name),
    ...(data.fusilAPompe ?? []).map((e) => e.name),
    ...(data.revolver ?? []).map((e) => e.name),
    ...(data.pistolet ?? []).map((e) => e.name),
  ].filter(Boolean);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, "fr"));
}
