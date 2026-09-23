/** `#rgb` / `#rrggbb` → 0–255 triple; null for anything else (`currentColor`) */
function parseHex(color: string): [number, number, number] | null {
  const hex = color.trim();
  if (!hex.startsWith("#")) return null;
  const body = hex.slice(1);
  const full =
    body.length === 3
      ? body
          .split("")
          .map((c) => c + c)
          .join("")
      : body;
  if (full.length !== 6 || !/^[0-9a-f]{6}$/i.test(full)) return null;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

/** WCAG relative luminance, 0 (black) – 1 (white) */
function luminance(color: string): number | null {
  const rgb = parseHex(color);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const INK_DARK = "#111111";
const INK_LIGHT = "#ffffff";

/**
 * Where `#111` stops losing to `#fff`: contrast is `(L + .05) / (L_dark + .05)`
 * for the dark ink and `1.05 / (L + .05)` for the light one, so they meet at
 * `L + .05 = sqrt(1.05 * (L_dark + .05))`. Derived rather than guessed — a
 * "looks light" threshold near 0.6 leaves white text on mid-tones at 1.7:1.
 */
const CROSSOVER = Math.sqrt(1.05 * ((luminance(INK_DARK) ?? 0) + 0.05)) - 0.05;

/**
 * Ink for text on a solid `color`. Explicit hex rather than a token: the
 * surface is a member colour and does not follow the theme, so a pale one needs
 * dark text in both themes.
 */
export function inkOn(color: string, threshold = CROSSOVER): string {
  const l = luminance(color);
  if (l === null) return "var(--foreground)";
  return l > threshold ? INK_DARK : INK_LIGHT;
}
