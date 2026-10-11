/**
 * How many of `total` thumbnails a one-line strip `width` px wide draws. When they all fit,
 * all of them; otherwise one place is kept back for the "+N" tile. An unmeasured strip
 * (width 0, the server render) draws `fallback`.
 */
export function fitCount(
  width: number,
  total: number,
  { thumb, gap, fallback }: { thumb: number; gap: number; fallback: number },
) {
  if (width <= 0) return Math.min(fallback, total);
  const slots = Math.floor((width + gap) / (thumb + gap));
  if (slots >= total) return total;
  return Math.max(slots - 1, 0);
}
