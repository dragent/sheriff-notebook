"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Flashbag, BACKEND_ERROR_SHORT } from "@/components/feedback/Flashbag";
import { WeaponSelect } from "@/components/ui/WeaponSelect";
import type { WeaponCategoryOption } from "@/lib/reference";
import { SHERIFF_FIELD_COMFORTABLE } from "@/lib/formFieldClasses";

export type ProfilRecord = {
  id: string;
  name: string;
  telegramPrimary: string | null;
  primaryWeapon: string | null;
  primaryWeaponSerial: string | null;
  primaryHasScope: boolean;
  hasScope: boolean;
  secondaryWeapon: string | null;
  secondaryWeaponSerial: string | null;
  secondaryHasScope: boolean;
  thirdWeapon: string | null;
  thirdWeaponSerial: string | null;
  thirdHasScope: boolean;
  tranquilizerWeapon: string | null;
  tranquilizerWeaponSerial: string | null;
  tranquilizerHasScope: boolean;
  cartInfo: string | null;
  boatInfo: string | null;
};

type ProfilFormProps = {
  record: ProfilRecord;
  weaponOptionsByCategory?: WeaponCategoryOption[];
  backendBaseUrl?: string;
  token?: string;
};

/** Séparateur pour plusieurs calèches/véhicules (stockage backend). */
const CART_INFO_SEP = "\n";
const SCOPE_UNSUPPORTED_WEAPON_TOKENS = [
  "pistolet",
  "revolver",
  "fusil a pompe",
  "fusil à pompe",
];

function normalizeWeaponName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseCartInfo(raw: string | null): string[] {
  if (!raw || !raw.trim()) return [""];
  const lines = raw.split(CART_INFO_SEP).map((s) => s.trim()).filter(Boolean);
  return lines.length > 0 ? lines : [""];
}

function serializeCartInfo(vehicles: string[]): string | null {
  const out = vehicles.map((s) => s.trim()).filter(Boolean);
  return out.length > 0 ? out.join(CART_INFO_SEP) : null;
}

function canHaveScope(weapon: string): boolean {
  const value = normalizeWeaponName(weapon);
  if (!value) return false;
  return !SCOPE_UNSUPPORTED_WEAPON_TOKENS
    .map((token) => normalizeWeaponName(token))
    .some((token) => value.includes(token));
}

/**
 * Formulaire profil : télégramme, armement, calèche ; envoi PATCH /api/services/[id].
 */
export function ProfilForm({
  record,
  weaponOptionsByCategory = [],
  backendBaseUrl: _backendBaseUrl,
  token: _token,
}: ProfilFormProps) {
  const flatWeapons = weaponOptionsByCategory.flatMap((c) => c.weapons);
  const hasWeaponOptions = flatWeapons.length > 0;
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [telegramPrimary, setTelegramPrimary] = useState(record.telegramPrimary ?? "");
  const [primaryWeapon, setPrimaryWeapon] = useState(record.primaryWeapon ?? "");
  const [primaryWeaponSerial, setPrimaryWeaponSerial] = useState(record.primaryWeaponSerial ?? "");
  const [primaryHasScope, setPrimaryHasScope] = useState(record.primaryHasScope ?? record.hasScope);
  const [secondaryWeapon, setSecondaryWeapon] = useState(record.secondaryWeapon ?? "");
  const [secondaryWeaponSerial, setSecondaryWeaponSerial] = useState(record.secondaryWeaponSerial ?? "");
  const [secondaryHasScope, setSecondaryHasScope] = useState(record.secondaryHasScope ?? false);
  const [thirdWeapon, setThirdWeapon] = useState(record.thirdWeapon ?? "");
  const [thirdWeaponSerial, setThirdWeaponSerial] = useState(record.thirdWeaponSerial ?? "");
  const [thirdHasScope, setThirdHasScope] = useState(record.thirdHasScope ?? false);
  const [tranquilizerWeapon, setTranquilizerWeapon] = useState(record.tranquilizerWeapon ?? "");
  const [tranquilizerWeaponSerial, setTranquilizerWeaponSerial] = useState(record.tranquilizerWeaponSerial ?? "");
  const [tranquilizerHasScope, setTranquilizerHasScope] = useState(record.tranquilizerHasScope ?? false);
  const [vehicles, setVehicles] = useState<string[]>(() => parseCartInfo(record.cartInfo ?? null));
  const [boats, setBoats] = useState<string[]>(() => parseCartInfo(record.boatInfo ?? null));
  const primaryScopeAllowed = canHaveScope(primaryWeapon);
  const secondaryScopeAllowed = canHaveScope(secondaryWeapon);
  const thirdScopeAllowed = canHaveScope(thirdWeapon);
  const tranquilizerScopeAllowed = canHaveScope(tranquilizerWeapon);

  const cartInfoSerialized = useMemo(() => serializeCartInfo(vehicles), [vehicles]);
  const boatInfoSerialized = useMemo(() => serializeCartInfo(boats), [boats]);
  const isDirty = useMemo(() => {
    const t = (v: string) => v.trim() || null;
    return (
      t(telegramPrimary) !== (record.telegramPrimary ?? null) ||
      t(primaryWeapon) !== (record.primaryWeapon ?? null) ||
      t(primaryWeaponSerial) !== (record.primaryWeaponSerial ?? null) ||
      (primaryScopeAllowed ? primaryHasScope : false) !== (record.primaryHasScope ?? record.hasScope) ||
      t(secondaryWeapon) !== (record.secondaryWeapon ?? null) ||
      t(secondaryWeaponSerial) !== (record.secondaryWeaponSerial ?? null) ||
      (secondaryScopeAllowed ? secondaryHasScope : false) !== (record.secondaryHasScope ?? false) ||
      t(thirdWeapon) !== (record.thirdWeapon ?? null) ||
      t(thirdWeaponSerial) !== (record.thirdWeaponSerial ?? null) ||
      (thirdScopeAllowed ? thirdHasScope : false) !== (record.thirdHasScope ?? false) ||
      t(tranquilizerWeapon) !== (record.tranquilizerWeapon ?? null) ||
      t(tranquilizerWeaponSerial) !== (record.tranquilizerWeaponSerial ?? null) ||
      (tranquilizerScopeAllowed ? tranquilizerHasScope : false) !== (record.tranquilizerHasScope ?? false) ||
      cartInfoSerialized !== (record.cartInfo ?? null) ||
      boatInfoSerialized !== (record.boatInfo ?? null)
    );
  }, [
    telegramPrimary,
    primaryWeapon,
    primaryWeaponSerial,
    primaryHasScope,
    secondaryWeapon,
    secondaryWeaponSerial,
    secondaryHasScope,
    thirdWeapon,
    thirdWeaponSerial,
    thirdHasScope,
    tranquilizerWeapon,
    tranquilizerWeaponSerial,
    tranquilizerHasScope,
    primaryScopeAllowed,
    secondaryScopeAllowed,
    thirdScopeAllowed,
    tranquilizerScopeAllowed,
    cartInfoSerialized,
    boatInfoSerialized,
    record,
  ]);

  useEffect(() => {
    if (!primaryScopeAllowed && primaryHasScope) setPrimaryHasScope(false);
  }, [primaryScopeAllowed, primaryHasScope]);
  useEffect(() => {
    if (!secondaryScopeAllowed && secondaryHasScope) setSecondaryHasScope(false);
  }, [secondaryScopeAllowed, secondaryHasScope]);
  useEffect(() => {
    if (!thirdScopeAllowed && thirdHasScope) setThirdHasScope(false);
  }, [thirdScopeAllowed, thirdHasScope]);
  useEffect(() => {
    if (!tranquilizerScopeAllowed && tranquilizerHasScope) setTranquilizerHasScope(false);
  }, [tranquilizerScopeAllowed, tranquilizerHasScope]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4500);
    return () => clearTimeout(t);
  }, [success]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramPrimary: telegramPrimary.trim() || null,
          primaryWeapon: primaryWeapon.trim() || null,
          primaryWeaponSerial: primaryWeaponSerial.trim() || null,
          hasScope: primaryScopeAllowed ? primaryHasScope : false,
          primaryHasScope: primaryScopeAllowed ? primaryHasScope : false,
          secondaryWeapon: secondaryWeapon.trim() || null,
          secondaryWeaponSerial: secondaryWeaponSerial.trim() || null,
          secondaryHasScope: secondaryScopeAllowed ? secondaryHasScope : false,
          thirdWeapon: thirdWeapon.trim() || null,
          thirdWeaponSerial: thirdWeaponSerial.trim() || null,
          thirdHasScope: thirdScopeAllowed ? thirdHasScope : false,
          tranquilizerWeapon: tranquilizerWeapon.trim() || null,
          tranquilizerWeaponSerial: tranquilizerWeaponSerial.trim() || null,
          tranquilizerHasScope: tranquilizerScopeAllowed ? tranquilizerHasScope : false,
          cartInfo: cartInfoSerialized,
          boatInfo: boatInfoSerialized,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setError(err?.error ?? `Erreur ${res.status}`);
        return;
      }
      setSuccess("Informations enregistrées.");
      router.refresh();
    } catch {
      setError(BACKEND_ERROR_SHORT.network);
    } finally {
      setSaving(false);
    }
  }

  const inputClass = `${SHERIFF_FIELD_COMFORTABLE} placeholder:text-sheriff-paper-muted/70`;
  const labelClass = "mb-1 block text-sm font-medium text-sheriff-paper-muted";

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
      <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-sheriff-gold/90">
        {children}
      </h2>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <Flashbag variant="success">{success}</Flashbag>
      )}
      {error && (
        <Flashbag variant="error">{error}</Flashbag>
      )}
      {isDirty && !success && !error && (
        <Flashbag variant="warning">
          Modifications non enregistrées
        </Flashbag>
      )}

      <div>
        <SectionTitle>Télégramme</SectionTitle>
        <label htmlFor="telegramPrimary" className={labelClass}>
          Numéro de télégramme
        </label>
        <input
          id="telegramPrimary"
          type="text"
          value={telegramPrimary}
          onChange={(e) => setTelegramPrimary(e.target.value)}
          className={inputClass}
          placeholder="ex. LGW-6938"
          maxLength={32}
        />
      </div>

      <div>
        <SectionTitle>Armes</SectionTitle>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="primaryWeapon" className={labelClass}>
                Arme principale
              </label>
              {hasWeaponOptions ? (
                <WeaponSelect
                  id="primaryWeapon"
                  value={primaryWeapon}
                  onChange={setPrimaryWeapon}
                  options={weaponOptionsByCategory}
                  aria-label="Arme principale"
                  variant="comfortable"
                  customValue={primaryWeapon && !flatWeapons.includes(primaryWeapon) ? primaryWeapon : undefined}
                />
              ) : (
                <input
                  id="primaryWeapon"
                  type="text"
                  value={primaryWeapon}
                  onChange={(e) => setPrimaryWeapon(e.target.value)}
                  className={inputClass}
                  placeholder="ex. Evans, Henry"
                  maxLength={64}
                />
              )}
            </div>
            <div>
              <label htmlFor="primaryWeaponSerial" className={labelClass}>
                N° série arme principale
              </label>
              <input
                id="primaryWeaponSerial"
                type="text"
                value={primaryWeaponSerial}
                onChange={(e) => setPrimaryWeaponSerial(e.target.value)}
                className={inputClass}
                placeholder="ex. 1753109400-7921"
                maxLength={32}
              />
            </div>
          </div>
          {primaryScopeAllowed && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={primaryHasScope}
                onChange={(e) => setPrimaryHasScope(e.target.checked)}
                className="sheriff-checkbox"
                aria-label="Lunette arme principale"
              />
              <span className="text-sm text-sheriff-paper-muted">Lunette arme principale</span>
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="secondaryWeapon" className={labelClass}>
                Arme secondaire
              </label>
              {hasWeaponOptions ? (
                <WeaponSelect
                  id="secondaryWeapon"
                  value={secondaryWeapon}
                  onChange={setSecondaryWeapon}
                  options={weaponOptionsByCategory}
                  aria-label="Arme secondaire"
                  variant="comfortable"
                  customValue={secondaryWeapon && !flatWeapons.includes(secondaryWeapon) ? secondaryWeapon : undefined}
                />
              ) : (
                <input
                  id="secondaryWeapon"
                  type="text"
                  value={secondaryWeapon}
                  onChange={(e) => setSecondaryWeapon(e.target.value)}
                  className={inputClass}
                  placeholder="ex. Cattleman"
                  maxLength={64}
                />
              )}
            </div>
            <div>
              <label htmlFor="secondaryWeaponSerial" className={labelClass}>
                N° série arme secondaire
              </label>
              <input
                id="secondaryWeaponSerial"
                type="text"
                value={secondaryWeaponSerial}
                onChange={(e) => setSecondaryWeaponSerial(e.target.value)}
                className={inputClass}
                placeholder="optionnel"
                maxLength={32}
              />
            </div>
          </div>
          {secondaryScopeAllowed && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={secondaryHasScope}
                onChange={(e) => setSecondaryHasScope(e.target.checked)}
                className="sheriff-checkbox"
                aria-label="Lunette arme secondaire"
              />
              <span className="text-sm text-sheriff-paper-muted">Lunette arme secondaire</span>
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="thirdWeapon" className={labelClass}>
                Arme 3
              </label>
              {hasWeaponOptions ? (
                <WeaponSelect
                  id="thirdWeapon"
                  value={thirdWeapon}
                  onChange={setThirdWeapon}
                  options={weaponOptionsByCategory}
                  aria-label="Arme 3"
                  variant="comfortable"
                  customValue={thirdWeapon && !flatWeapons.includes(thirdWeapon) ? thirdWeapon : undefined}
                />
              ) : (
                <input
                  id="thirdWeapon"
                  type="text"
                  value={thirdWeapon}
                  onChange={(e) => setThirdWeapon(e.target.value)}
                  className={inputClass}
                  placeholder="optionnel"
                  maxLength={64}
                />
              )}
            </div>
            <div>
              <label htmlFor="thirdWeaponSerial" className={labelClass}>
                N° série arme 3
              </label>
              <input
                id="thirdWeaponSerial"
                type="text"
                value={thirdWeaponSerial}
                onChange={(e) => setThirdWeaponSerial(e.target.value)}
                className={inputClass}
                placeholder="optionnel"
                maxLength={32}
              />
            </div>
          </div>
          {thirdScopeAllowed && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={thirdHasScope}
                onChange={(e) => setThirdHasScope(e.target.checked)}
                className="sheriff-checkbox"
                aria-label="Lunette arme 3"
              />
              <span className="text-sm text-sheriff-paper-muted">Lunette arme 3</span>
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tranquilizerWeapon" className={labelClass}>
                Fusil tranquillisant
              </label>
              {hasWeaponOptions ? (
                <WeaponSelect
                  id="tranquilizerWeapon"
                  value={tranquilizerWeapon}
                  onChange={setTranquilizerWeapon}
                  options={weaponOptionsByCategory}
                  aria-label="Fusil tranquillisant"
                  variant="comfortable"
                  customValue={tranquilizerWeapon && !flatWeapons.includes(tranquilizerWeapon) ? tranquilizerWeapon : undefined}
                />
              ) : (
                <input
                  id="tranquilizerWeapon"
                  type="text"
                  value={tranquilizerWeapon}
                  onChange={(e) => setTranquilizerWeapon(e.target.value)}
                  className={inputClass}
                  placeholder="optionnel"
                  maxLength={64}
                />
              )}
            </div>
            <div>
              <label htmlFor="tranquilizerWeaponSerial" className={labelClass}>
                N° série fusil tranquillisant
              </label>
              <input
                id="tranquilizerWeaponSerial"
                type="text"
                value={tranquilizerWeaponSerial}
                onChange={(e) => setTranquilizerWeaponSerial(e.target.value)}
                className={inputClass}
                placeholder="optionnel"
                maxLength={32}
              />
            </div>
          </div>
          {tranquilizerScopeAllowed && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={tranquilizerHasScope}
                onChange={(e) => setTranquilizerHasScope(e.target.checked)}
                className="sheriff-checkbox"
                aria-label="Lunette fusil tranquillisant"
              />
              <span className="text-sm text-sheriff-paper-muted">Lunette fusil tranquillisant</span>
            </label>
          )}
        </div>
      </div>

      <div>
        <SectionTitle>Calèche ou bateau</SectionTitle>
        <p className={labelClass}>
          Calèche(s)
        </p>
        <div className="space-y-2">
          {vehicles.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  const next = [...vehicles];
                  next[index] = e.target.value;
                  setVehicles(next);
                }}
                className={inputClass}
                placeholder="ex. Blindé 4ch"
                maxLength={120}
                aria-label={`Calèche ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => {
                  if (vehicles.length <= 1) {
                    setVehicles([""]);
                  } else {
                    setVehicles(vehicles.filter((_, i) => i !== index));
                  }
                }}
                className="sheriff-focus-ring sheriff-btn-destructive-icon shrink-0 rounded p-1.5"
                title="Supprimer"
                aria-label="Supprimer cette calèche"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setVehicles([...vehicles, ""])}
            className="sheriff-focus-ring rounded border border-dashed border-sheriff-gold/40 bg-sheriff-charcoal/30 px-3 py-1.5 text-xs text-sheriff-gold/90 transition hover:border-sheriff-gold/60 hover:bg-sheriff-gold/10"
          >
            + Ajouter une calèche
          </button>
        </div>
        <p className={`${labelClass} mt-4`}>
          Bateau(x)
        </p>
        <div className="space-y-2">
          {boats.map((value, index) => (
            <div key={`boat-${index}`} className="flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  const next = [...boats];
                  next[index] = e.target.value;
                  setBoats(next);
                }}
                className={inputClass}
                placeholder="ex. Canot, Barque"
                maxLength={120}
                aria-label={`Bateau ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => {
                  if (boats.length <= 1) {
                    setBoats([""]);
                  } else {
                    setBoats(boats.filter((_, i) => i !== index));
                  }
                }}
                className="sheriff-focus-ring sheriff-btn-destructive-icon shrink-0 rounded p-1.5"
                title="Supprimer"
                aria-label="Supprimer ce bateau"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setBoats([...boats, ""])}
            className="sheriff-focus-ring rounded border border-dashed border-sheriff-gold/40 bg-sheriff-charcoal/30 px-3 py-1.5 text-xs text-sheriff-gold/90 transition hover:border-sheriff-gold/60 hover:bg-sheriff-gold/10"
          >
            + Ajouter un bateau
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-sheriff-gold/30 pt-4">
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="sheriff-focus-ring sheriff-btn-save inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && (
            <svg
              className="h-4 w-4 animate-spin shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="32"
                strokeDashoffset="12"
              />
            </svg>
          )}
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {!isDirty && !saving && (
          <span className="text-xs text-sheriff-paper-muted">Aucune modification</span>
        )}
      </div>
    </form>
  );
}
