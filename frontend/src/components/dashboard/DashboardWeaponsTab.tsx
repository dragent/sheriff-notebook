"use client";

import { EmptyTableState } from "@/components/ui/EmptyTableState";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { resolveRowGrade } from "@/lib/grades";
import {
  canDisplayScopeForWeapon,
  formatCartAndBoat,
  type BureauRow,
} from "@/components/dashboard/dashboardShared";

type Props = {
  bureauRows: BureauRow[];
  sheriffsCount: number;
};

/** "Armes & véhicules" tab — read-only ledger view of every sheriff's loadout. */
export function DashboardWeaponsTab({ bureauRows, sheriffsCount }: Props) {
  const showPrimaryScopeColumn = bureauRows.some(
    ({ record }) => canDisplayScopeForWeapon(record?.primaryWeapon),
  );
  const showSecondaryScopeColumn = bureauRows.some(
    ({ record }) => canDisplayScopeForWeapon(record?.secondaryWeapon),
  );
  const showThirdScopeColumn = bureauRows.some(
    ({ record }) => canDisplayScopeForWeapon(record?.thirdWeapon),
  );
  const showTranquilizerScopeColumn = bureauRows.some(
    ({ record }) => canDisplayScopeForWeapon(record?.tranquilizerWeapon),
  );
  const visibleScopeColumnsCount =
    Number(showPrimaryScopeColumn) +
    Number(showSecondaryScopeColumn) +
    Number(showThirdScopeColumn) +
    Number(showTranquilizerScopeColumn);

  return (
    <div
      className="sheriff-card sheriff-card--paper w-full overflow-hidden rounded-lg border-sheriff-gold/40 shadow-md"
      role="tabpanel"
      aria-label="Armes et véhicules du bureau"
    >
      <div className="border-b border-sheriff-gold/40 bg-sheriff-charcoal/80 px-4 py-4">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-sheriff-gold">
          Armes &amp; véhicules — {sheriffsCount} shérifs
        </h2>
        <p className="mt-1.5 text-xs text-sheriff-paper-muted/90">
          Armes principales, secondaires, tertiaires et fusil tranquillisant, avec lunettes et véhicules.
        </p>
      </div>
      <div className="sheriff-table-scroll overflow-x-auto">
        <table className="sheriff-table--ledger w-full text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="sheriff-table-head-rule bg-sheriff-charcoal/95 text-xs uppercase tracking-wide text-sheriff-gold/90">
              <th className="sheriff-sticky-col-shadow sticky left-0 z-10 whitespace-nowrap px-2 py-2 font-heading bg-sheriff-charcoal/95">
                NOM
              </th>
              <th className="whitespace-nowrap px-2 py-2 font-heading">Télégramme</th>
              <th className="whitespace-nowrap px-2 py-2 text-center font-heading">Grade</th>
              <th className="whitespace-nowrap px-2 py-2 font-heading">Arme princ.</th>
              <th className="whitespace-nowrap px-2 py-2 font-heading">N° série</th>
              {showPrimaryScopeColumn && (
                <th className="whitespace-nowrap px-2 py-2 text-center font-heading">Scope 1</th>
              )}
              <th className="whitespace-nowrap px-2 py-2 font-heading">Arme sec.</th>
              <th className="whitespace-nowrap px-2 py-2 font-heading">N° série 2</th>
              {showSecondaryScopeColumn && (
                <th className="whitespace-nowrap px-2 py-2 text-center font-heading">Scope 2</th>
              )}
              <th className="whitespace-nowrap px-2 py-2 font-heading">Arme 3</th>
              <th className="whitespace-nowrap px-2 py-2 font-heading">N° série 3</th>
              {showThirdScopeColumn && (
                <th className="whitespace-nowrap px-2 py-2 text-center font-heading">Scope 3</th>
              )}
              <th className="whitespace-nowrap px-2 py-2 font-heading">Fusil tranqu.</th>
              <th className="whitespace-nowrap px-2 py-2 font-heading">N° série T</th>
              {showTranquilizerScopeColumn && (
                <th className="whitespace-nowrap px-2 py-2 text-center font-heading">Scope T</th>
              )}
              <th className="whitespace-nowrap px-2 py-2 text-center font-heading">Calèche / Bateau</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sheriff-gold/20">
            {bureauRows.map(({ sheriff, record: r }) =>
              r ? (
                <tr key={r.id} className="group transition hover:bg-sheriff-gold/5">
                  <td className="sticky left-0 z-1 w-36 shrink-0 whitespace-nowrap bg-sheriff-wood px-2 py-2 font-medium text-sheriff-paper sheriff-sticky-col-shadow group-hover:bg-sheriff-gold/5">
                    {r.name}
                  </td>
                  <td className="font-stamp whitespace-nowrap px-2 py-2 text-sheriff-paper-muted">{r.telegramPrimary ?? "—"}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-center">
                    <GradeBadge grade={resolveRowGrade(r.grade, sheriff.grade)} size="sm" iconOnly />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper">{r.primaryWeapon ?? "—"}</td>
                  <td className="font-stamp whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper">{r.primaryWeaponSerial ?? "—"}</td>
                  {showPrimaryScopeColumn && (
                    <td className="px-2 py-2 text-center text-sheriff-paper">
                      {canDisplayScopeForWeapon(r.primaryWeapon) ? (
                        <input
                          type="checkbox"
                          checked={r.primaryHasScope ?? r.hasScope}
                          disabled
                          readOnly
                          aria-label="Scope arme principale"
                          className="sheriff-checkbox sheriff-checkbox--disabled-only inline-block align-middle"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper">{r.secondaryWeapon ?? "—"}</td>
                  <td className="font-stamp whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper">{r.secondaryWeaponSerial ?? "—"}</td>
                  {showSecondaryScopeColumn && (
                    <td className="px-2 py-2 text-center text-sheriff-paper">
                      {canDisplayScopeForWeapon(r.secondaryWeapon) ? (
                        <input
                          type="checkbox"
                          checked={r.secondaryHasScope}
                          disabled
                          readOnly
                          aria-label="Scope arme secondaire"
                          className="sheriff-checkbox sheriff-checkbox--disabled-only inline-block align-middle"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper">{r.thirdWeapon ?? "—"}</td>
                  <td className="font-stamp whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper">{r.thirdWeaponSerial ?? "—"}</td>
                  {showThirdScopeColumn && (
                    <td className="px-2 py-2 text-center text-sheriff-paper">
                      {canDisplayScopeForWeapon(r.thirdWeapon) ? (
                        <input
                          type="checkbox"
                          checked={r.thirdHasScope}
                          disabled
                          readOnly
                          aria-label="Scope arme 3"
                          className="sheriff-checkbox sheriff-checkbox--disabled-only inline-block align-middle"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper">{r.tranquilizerWeapon ?? "—"}</td>
                  <td className="font-stamp whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper">{r.tranquilizerWeaponSerial ?? "—"}</td>
                  {showTranquilizerScopeColumn && (
                    <td className="px-2 py-2 text-center text-sheriff-paper">
                      {canDisplayScopeForWeapon(r.tranquilizerWeapon) ? (
                        <input
                          type="checkbox"
                          checked={r.tranquilizerHasScope}
                          disabled
                          readOnly
                          aria-label="Scope fusil tranquillisant"
                          className="sheriff-checkbox sheriff-checkbox--disabled-only inline-block align-middle"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className="font-stamp whitespace-nowrap px-2 py-2 text-sm text-sheriff-paper">
                    {formatCartAndBoat(r.cartInfo, r.boatInfo)}
                  </td>
                </tr>
              ) : (
                <tr key={`sheriff-${sheriff.username}`} className="group transition hover:bg-sheriff-gold/5">
                  <td className="sticky left-0 z-1 w-36 shrink-0 whitespace-nowrap bg-sheriff-wood px-2 py-2 font-medium text-sheriff-paper sheriff-sticky-col-shadow group-hover:bg-sheriff-gold/5">
                    {sheriff.username}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-sheriff-paper-muted">—</td>
                  <td className="whitespace-nowrap px-2 py-2 text-center">
                    <GradeBadge grade={sheriff.grade} size="sm" iconOnly />
                  </td>
                  <td
                    colSpan={9 + visibleScopeColumnsCount}
                    className="whitespace-nowrap px-2 py-2 text-sheriff-paper-muted"
                  >
                    —
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
        {sheriffsCount > 0 && (
          <div className="mt-2 px-2 pb-3 text-xs text-sheriff-paper-muted sm:hidden">
            Glissez horizontalement pour parcourir l&apos;armement et les véhicules de tout le bureau.
          </div>
        )}
        {sheriffsCount === 0 && (
          <EmptyTableState
            message="Aucun shérif."
            subtitle="Les armes et véhicules apparaîtront ici dès qu'une fiche sera créée."
          />
        )}
      </div>
    </div>
  );
}
