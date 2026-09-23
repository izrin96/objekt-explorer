/**
 * Contrast helpers for the one place in the lab that paints text *on* a member
 * colour: the Progress chart's `count/total (pct%)` label, which sits over the
 * bar once the bar is long enough to reach it.
 *
 * Everywhere else a member colour is a swatch, where a `ring-1 ring-foreground/15` is
 * what holds the pale ones. A ring cannot help a label, so this picks the
 * label's own colour instead.
 */

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
 * Where `#111` stops losing to `#fff`. WCAG contrast against a background of
 * luminance `L` is `(L + .05) / (L_ink + .05)` for the dark ink and
 * `1.05 / (L + .05)` for the light one; they meet at
 * `L + .05 = sqrt(1.05 * (L_dark + .05))`.
 *
 * It is worth deriving rather than guessing, because the obvious guess — "is
 * this colour light", around 0.6 — is a different question and gets the
 * mid-tones wrong: GyeongBeen's `#4EDD9C` sits at 0.56, so a 0.6 threshold
 * leaves white text on mint at 1.7:1.
 */
const CROSSOVER = Math.sqrt(1.05 * ((luminance(INK_DARK) ?? 0) + 0.05)) - 0.05;

/**
 * The ink to use on a solid `color`, whichever of the two has more contrast
 * against it. Explicit hex rather than a token, because the surface is the
 * member's own colour and does not follow the theme — SeoAh's `#CFF3FF` needs
 * dark text on the light theme *and* on the dark one. A colour that cannot be
 * parsed falls back to the page's own foreground.
 */
export function inkOn(color: string, threshold = CROSSOVER): string {
  const l = luminance(color);
  if (l === null) return "var(--foreground)";
  return l > threshold ? INK_DARK : INK_LIGHT;
}
