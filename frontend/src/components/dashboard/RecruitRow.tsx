"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SHERIFF_NATIVE_SELECT_COMFORTABLE } from "@/lib/formFieldClasses";

export type Member = {
  id: string;
  username: string;
  avatarUrl: string | null;
  grade: string | null;
  /** True si la personne s'est déjà connectée au site (compte en base). */
  connectedToSite?: boolean;
};

const GRADES = [
  { value: "Sheriff de comté", label: "Sheriff de comté" },
  { value: "Sheriff Adjoint", label: "Sheriff adjoint" },
  { value: "Sheriff en chef", label: "Sheriff en chef" },
  { value: "Sheriff", label: "Sheriff" },
  { value: "Sheriff Deputy", label: "Sheriff deputy" },
  { value: "Deputy", label: "Deputy" },
] as const;

/**
 * Ligne recrutement : membre + select grade ; appelle onAssigned après attribution.
 * Mobile : menu déroulant ; desktop : boutons.
 */
export function RecruitRow({
  member,
  onAssigned,
}: {
  member: Member;
  /** Appelé après attribution d'un grade (pour rafraîchir la liste en popup). */
  onAssigned?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function setGrade(gradeValue: string) {
    setLoading(gradeValue);
    try {
      const res = await fetch(`/api/users/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ grade: gradeValue }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; discordRoleError?: string };
      if (!res.ok) {
        const message =
          (body?.error as string | undefined) ||
          `Erreur ${res.status}: ${res.statusText || "Impossible d'enregistrer le grade."}`;
        window.alert(message);
        return;
      }

      if (body?.discordRoleError) {
        window.alert(
          String(body.discordRoleError) ||
            "Grade enregistré, mais le rôle Discord n'a pas pu être mis à jour."
        );
      }

      onAssigned?.();
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const isDisabled = loading !== null;

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-sheriff-gold/20 py-3.5 last:border-0 last:pb-0">
      {member.avatarUrl ? (
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-sheriff-gold/30 bg-sheriff-charcoal">
          <Image
            src={member.avatarUrl}
            alt=""
            fill
            className="object-cover"
            sizes="44px"
          />
        </span>
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sheriff-gold/30 bg-sheriff-gold/15 text-sm font-medium text-sheriff-gold">
          {member.username.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="flex min-w-0 flex-1 shrink basis-24 items-center gap-2">
        <span className="min-w-0 truncate font-medium text-sheriff-paper" title={member.username}>
          {member.username}
        </span>
        {member.connectedToSite === false && (
          <span
            className="shrink-0 rounded border border-sheriff-gold/20 bg-sheriff-tab-track/35 px-1.5 py-0.5 text-[10px] text-sheriff-paper-muted"
            title="Membre du serveur Discord, pas encore connecté au site"
          >
            Pas encore connecté
          </span>
        )}
        {member.grade && (
          <span className="shrink-0 rounded border border-sheriff-gold/25 bg-sheriff-tab-active-bg/20 px-2 py-0.5 text-xs text-sheriff-paper">
            {member.grade}
          </span>
        )}
      </div>
      <div className="w-full min-w-0 sm:w-auto md:hidden">
        <label htmlFor={`grade-${member.id}`} className="sr-only">
          Attribuer un grade à {member.username}
        </label>
        <select
          id={`grade-${member.id}`}
          disabled={isDisabled}
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) setGrade(v);
          }}
          className={`${SHERIFF_NATIVE_SELECT_COMFORTABLE} disabled:opacity-55`}
        >
          <option value="">Choisir un grade</option>
          {GRADES.map(({ value, label }) => (
            <option key={value} value={value} disabled={member.grade === value}>
              {label}
            </option>
          ))}
        </select>
        {loading && (
          <p className="mt-1 text-xs text-sheriff-paper-muted">Enregistrement…</p>
        )}
      </div>
      <div className="hidden shrink-0 flex-wrap gap-2 md:flex">
        {GRADES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            disabled={isDisabled || member.grade === value}
            onClick={() => setGrade(value)}
            className="sheriff-focus-ring sheriff-btn-secondary rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {loading === value ? "…" : label}
          </button>
        ))}
      </div>
    </li>
  );
}
