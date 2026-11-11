import { hexToHsv, hsvToHex } from "@/components/ui/color-picker";

/**
 * Lowercase `#rrggbb`, or null if `hex` does not parse. The picker re-seeds whenever its
 * `value` differs from its own `#rrggbb`, so a `#fff` or `ff0000` from a hand-edited URL
 * would re-render it forever.
 */
export function canonicalHex(hex: string | undefined): string | null {
  const parsed = hex ? hexToHsv(hex) : null;
  return parsed ? hsvToHex(parsed) : null;
}
