/**
 * CIEDE2000 colour difference between two CSS colours, as chroma-js's `deltaE` computes it, for
 * the colour filter. Parses the forms collection backgrounds and the picker use: `#rgb`,
 * `#rrggbb`, `#rrggbbaa` and `rgb()`/`rgba()`; alpha is ignored.
 */

export type Lab = readonly [l: number, a: number, b: number];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i;

/** The colour as CIE Lab (D65), or null when it is not one of the forms above. */
export function parseLab(input: string): Lab | null {
  const text = input.trim();
  let rgb: [number, number, number] | null = null;
  const hex = HEX.exec(text)?.[1];
  if (hex) {
    const full = hex.length === 3 ? hex.replace(/./g, "$&$&") : hex.slice(0, 6);
    rgb = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)) as [
      number,
      number,
      number,
    ];
  } else {
    const match = RGB.exec(text);
    if (match) rgb = [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  if (!rgb || rgb.some((v) => !Number.isFinite(v) || v < 0 || v > 255)) return null;
  return rgbToLab(rgb);
}

const linear = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

// D65 white, the reference chroma-js uses
const WHITE = [0.95047, 1, 1.08883] as const;
const labF = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 / 116) * t + 16 / 116);

function rgbToLab([r8, g8, b8]: readonly number[]): Lab {
  const r = linear(r8!);
  const g = linear(g8!);
  const b = linear(b8!);
  const x = labF((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / WHITE[0]);
  const y = labF((0.2126729 * r + 0.7151522 * g + 0.072175 * b) / WHITE[1]);
  const z = labF((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / WHITE[2]);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/**
 * CIEDE2000 with kL = kC = kH = 1, in Bruce Lindbloom's form as chroma-js 3 has it (its hue
 * average, clamped to 0..100), so the filter's sensitivity keeps the meaning it had.
 */
export function deltaE2000([l1, a1, b1]: Lab, [l2, a2, b2]: Lab): number {
  const avgL = (l1 + l2) / 2;
  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);
  const avgC = (c1 + c2) / 2;
  const g = 0.5 * (1 - Math.sqrt(avgC ** 7 / (avgC ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + g);
  const a2p = a2 * (1 + g);
  const c1p = Math.hypot(a1p, b1);
  const c2p = Math.hypot(a2p, b2);
  const avgCp = (c1p + c2p) / 2;
  const t1 = deg(Math.atan2(b1, a1p));
  const t2 = deg(Math.atan2(b2, a2p));
  const h1p = t1 >= 0 ? t1 : t1 + 360;
  const h2p = t2 >= 0 ? t2 : t2 + 360;
  const avgHp = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + 360) / 2 : (h1p + h2p) / 2;
  const t =
    1 -
    0.17 * Math.cos(rad(avgHp - 30)) +
    0.24 * Math.cos(rad(2 * avgHp)) +
    0.32 * Math.cos(rad(3 * avgHp + 6)) -
    0.2 * Math.cos(rad(4 * avgHp - 63));
  let dhp = h2p - h1p;
  if (Math.abs(dhp) > 180) dhp = h2p <= h1p ? dhp + 360 : dhp - 360;
  const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin(rad(dhp) / 2);
  const dLp = l2 - l1;
  const dCp = c2p - c1p;
  const sl = 1 + (0.015 * (avgL - 50) ** 2) / Math.sqrt(20 + (avgL - 50) ** 2);
  const sc = 1 + 0.045 * avgCp;
  const sh = 1 + 0.015 * avgCp * t;
  const dTheta = 30 * Math.exp(-(((avgHp - 275) / 25) ** 2));
  const rc = 2 * Math.sqrt(avgCp ** 7 / (avgCp ** 7 + 25 ** 7));
  const rt = -rc * Math.sin(2 * rad(dTheta));
  const result = Math.sqrt(
    (dLp / sl) ** 2 + (dCp / sc) ** 2 + (dHp / sh) ** 2 + rt * (dCp / sc) * (dHp / sh),
  );
  return Math.max(0, Math.min(100, result));
}
