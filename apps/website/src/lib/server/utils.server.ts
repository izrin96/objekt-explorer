import type { ValidArtist } from "@repo/cosmo/types/common";

export function escapeCSV(value: string) {
  // Neutralize spreadsheet formula injection: a cell that begins with one of
  // these characters is treated as a formula by Excel/Sheets. Prefix an
  // apostrophe so it is rendered as literal text.
  const needsFormulaGuard = /^[=+\-@\t\r]/.test(value);
  const guarded = needsFormulaGuard ? `'${value}` : value;

  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

/** Keeps per-token-id statements under the 65535 bind parameter cap. */
export const TOKEN_CHUNK_SIZE = 5000;

export const classOrder: Record<ValidArtist, string[]> = {
  tripleS: ["First", "Double", "Motion", "Unit", "Special", "Premier", "Welcome", "Zero"],
  artms: ["First", "Double", "Motion", "Unit", "Special", "Premier", "Welcome", "Zero"],
  idntt: ["Basic", "Event", "Motion", "Special", "Unit", "Welcome"],
};
