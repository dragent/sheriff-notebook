/**
 * Registry form fields — chrome is defined in `globals.css` (`.sheriff-registry-field*`,
 * `.sheriff-registry-listbox`, `.sheriff-registry-option*`). Reference: page profil
 * (comfortable inputs + WeaponSelect).
 */

const FIELD_FOCUS =
  "focus:border-sheriff-gold focus:outline-none sheriff-focus-ring";

/** Tables, dense grids (saisies, destruction, coffres tableau). */
export const SHERIFF_FIELD_DENSE =
  `sheriff-registry-field sheriff-registry-field--dense ${FIELD_FOCUS}`;

/** Profil, modales compta, recrutement. */
export const SHERIFF_FIELD_COMFORTABLE =
  `sheriff-registry-field sheriff-registry-field--comfortable ${FIELD_FOCUS}`;

/** Native `<select>` — add `.sheriff-select` for chevron + option list colors. */
export const SHERIFF_NATIVE_SELECT_DENSE = `${SHERIFF_FIELD_DENSE} sheriff-select`;

export const SHERIFF_NATIVE_SELECT_COMFORTABLE = `${SHERIFF_FIELD_COMFORTABLE} sheriff-select`;

export const SHERIFF_COMBOBOX_TRIGGER_DENSE = `${SHERIFF_FIELD_DENSE} flex min-w-0 items-center justify-between text-left`;

export const SHERIFF_COMBOBOX_TRIGGER_COMFORTABLE = `${SHERIFF_FIELD_COMFORTABLE} flex min-w-0 items-center justify-between text-left`;

/** Listbox panel — see `.sheriff-registry-listbox` in globals.css */
export const SHERIFF_COMBOBOX_LIST = "sheriff-registry-listbox";
