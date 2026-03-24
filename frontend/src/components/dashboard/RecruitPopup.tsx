"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RecruitRow, type Member } from "./RecruitRow";
import { Flashbag, BACKEND_FLASHBAG_MESSAGES } from "@/components/feedback/Flashbag";

type RecruitPopupProps = {
  trigger?: React.ReactNode;
};

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function RecruitPopup({ trigger }: RecruitPopupProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  const fetchRecruits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recruits", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          data.error === "Backend injoignable"
            ? "network"
            : "Impossible de charger la liste."
        );
        setMembers([]);
        return;
      }
      const data = (await res.json()) as Member[];
      setMembers(data);
    } catch {
      setError("network");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleOpen() {
    setOpen(true);
    fetchRecruits();
  }

  const handleClose = useCallback(() => {
    setOpen(false);
    setError(null);
    router.refresh();
    previousActiveRef.current?.focus();
  }, [router]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  // Trap focus inside modal and restore on close (accessibility).
  useEffect(() => {
    if (!open || !modalRef.current) return;
    previousActiveRef.current =
      (document.activeElement as HTMLElement) ?? null;
    const modal = modalRef.current;
    const focusable = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    modal.addEventListener("keydown", onKeyDown);
    return () => modal.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="sheriff-focus-ring sheriff-btn-secondary rounded-md px-3 py-2 text-sm font-semibold"
      >
        {trigger ?? "Recrutement"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recruit-modal-title"
        >
          <div
            className="absolute inset-0 bg-sheriff-charcoal/85 backdrop-blur-md"
            onClick={handleClose}
            aria-hidden
          />
          <div
            ref={modalRef}
            tabIndex={-1}
            className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-sheriff-gold/35 bg-sheriff-wood shadow-2xl ring-1 ring-sheriff-gold/15"
          >
            <div className="flex items-center justify-between border-b border-sheriff-gold/40 bg-sheriff-charcoal/95 px-5 py-3.5">
              <h2
                id="recruit-modal-title"
                className="font-heading text-base font-semibold uppercase tracking-wider text-sheriff-gold"
              >
                Recrutement
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="sheriff-focus-ring rounded-lg p-2 text-sheriff-paper-muted transition hover:bg-sheriff-gold/15 hover:text-sheriff-gold"
                aria-label="Fermer"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="sheriff-table-scroll max-h-[70vh] overflow-y-auto px-5 py-4">
              {loading && (
                <p className="py-6 text-center text-sm text-sheriff-paper-muted">
                  Chargement…
                </p>
              )}
              {error && (
                <Flashbag variant="error">
                  {error === "network"
                    ? BACKEND_FLASHBAG_MESSAGES.network
                    : error}
                </Flashbag>
              )}
              {!loading && !error && members.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-10 px-4 text-center" role="status" aria-live="polite">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sheriff-gold/10">
                    <svg className="h-7 w-7 text-sheriff-gold/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-sheriff-paper">
                      Aucune personne à recruter
                    </p>
                    <p className="max-w-sm text-xs leading-relaxed text-sheriff-paper-muted">
                      Les membres du serveur sans rôle Deputy à Sheriff de comté (nom identique aux grades du site) apparaissent ici. Vérifiez le bot et l&apos;intent « Server Members ».
                    </p>
                  </div>
                </div>
              )}
              {!loading && !error && members.length > 0 && (() => {
                const connected = members.filter((m) => m.connectedToSite !== false);
                const notConnected = members.filter((m) => m.connectedToSite === false);
                return (
                  <div className="space-y-6">
                    {notConnected.length > 0 && (
                      <section
                        aria-labelledby="recruit-not-connected-heading"
                        className="rounded-lg border border-sheriff-gold/25 bg-sheriff-tab-track/20 p-4"
                      >
                        <h3 id="recruit-not-connected-heading" className="mb-1.5 font-heading text-xs font-semibold uppercase tracking-wider text-sheriff-paper">
                          Pas encore connectés au site ({notConnected.length})
                        </h3>
                        <p className="mb-3 text-xs leading-relaxed text-sheriff-paper-muted">
                          Attribuez un grade ; un compte sera créé à leur première connexion.
                        </p>
                        <ul className="divide-y divide-sheriff-gold/20">
                          {notConnected.map((member) => (
                            <RecruitRow key={member.id} member={member} onAssigned={fetchRecruits} />
                          ))}
                        </ul>
                      </section>
                    )}
                    {connected.length > 0 && (
                      <section
                        aria-labelledby="recruit-connected-heading"
                        className="rounded-lg border border-sheriff-gold/25 bg-sheriff-tab-track/20 p-4"
                      >
                        <h3 id="recruit-connected-heading" className="mb-3 font-heading text-xs font-semibold uppercase tracking-wider text-sheriff-paper">
                          Déjà connectés au site ({connected.length})
                        </h3>
                        <ul className="divide-y divide-sheriff-gold/20">
                          {connected.map((member) => (
                            <RecruitRow key={member.id} member={member} onAssigned={fetchRecruits} />
                          ))}
                        </ul>
                      </section>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
