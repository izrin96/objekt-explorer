/**
 * How many of `total` thumbnails a one-line strip `width` px wide draws. When they all fit,
 * all of them; otherwise one place is kept back for the "+N" tile. `reserve` is the width of a
 * trailing link, and the gap before it, that the thumbnails must leave room for. An unmeasured
 * strip (width 0, the server render) draws `fallback`.
 */
export function fitCount(
  width: number,
  total: number,
  {
    thumb,
    gap,
    fallback,
    reserve = 0,
  }: { thumb: number; gap: number; fallback: number; reserve?: number },
) {
  if (width <= 0) return Math.min(fallback, total);
  const usable = reserve > 0 ? width - reserve - gap : width;
  const slots = Math.floor((usable + gap) / (thumb + gap));
  if (slots >= total) return total;
  return Math.max(slots - 1, 0);
}
