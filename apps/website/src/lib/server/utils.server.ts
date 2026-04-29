import type { ValidArtist } from "@repo/cosmo/types/common";

export function escapeCSV(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const classOrder: Record<ValidArtist, string[]> = {
  tripleS: ["First", "Double", "Motion", "Unit", "Special", "Premier", "Welcome", "Zero"],
  artms: ["First", "Double", "Motion", "Unit", "Special", "Premier", "Welcome", "Zero"],
  idntt: ["Basic", "Event", "Motion", "Special", "Unit", "Welcome"],
};
