/**
 * Shared form control chrome — inputs, native selects, and combobox triggers
 * use the same tokens so registry UI stays consistent across pages.
 */

const FIELD_FOCUS =
  "focus:border-sheriff-gold focus:outline-none sheriff-focus-ring";

/** Tables, dense grids, inline forms (saisies, destruction). */
export const SHERIFF_FIELD_DENSE =
  `w-full rounded border border-sheriff-gold/30 bg-sheriff-charcoal px-2.5 py-1.5 text-xs sm:text-sm text-sheriff-paper placeholder:text-sheriff-paper-muted ${FIELD_FOCUS}`;

/** Native `<select>` — pair with `globals.css` `.sheriff-select` (chevron + option colors). */
export const SHERIFF_NATIVE_SELECT_DENSE = `${SHERIFF_FIELD_DENSE} sheriff-select`;

/** Modals, profile, comfortable tap targets. */
export const SHERIFF_FIELD_COMFORTABLE =
  `w-full rounded border border-sheriff-gold/30 bg-sheriff-charcoal px-3 py-2 text-sm text-sheriff-paper placeholder:text-sheriff-paper-muted ${FIELD_FOCUS}`;

export const SHERIFF_NATIVE_SELECT_COMFORTABLE = `${SHERIFF_FIELD_COMFORTABLE} sheriff-select`;

/** Combobox trigger — same surface as `SHERIFF_FIELD_DENSE`. */
export const SHERIFF_COMBOBOX_TRIGGER_DENSE = `${SHERIFF_FIELD_DENSE} flex min-w-0 items-center justify-between text-left`;

/** Combobox trigger — same surface as `SHERIFF_FIELD_COMFORTABLE` (profil, modales). */
export const SHERIFF_COMBOBOX_TRIGGER_COMFORTABLE = `${SHERIFF_FIELD_COMFORTABLE} flex min-w-0 items-center justify-between text-left`;

/** Dropdown panel (listbox) — matches select panel contrast. */
export const SHERIFF_COMBOBOX_LIST =
  "absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded border border-sheriff-gold/30 bg-sheriff-charcoal py-1 shadow-lg";
