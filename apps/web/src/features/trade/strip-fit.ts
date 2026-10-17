/**
 * How many of `total` thumbnails a strip `width` px wide draws on up to `lines` lines. When
 * they all fit, all of them; otherwise one place is kept back for the "+N" tile. `reserve` is
 * the width of a trailing link, and the gap before it, that the last line must leave room
 * for. An unmeasured strip (width 0, the server render) draws `fallback`.
 */
export function fitCount(
  width: number,
  total: number,
  {
    thumb,
    gap,
    fallback,
    reserve = 0,
    lines = 1,
  }: { thumb: number; gap: number; fallback: number; reserve?: number; lines?: number },
) {
  if (width <= 0) return Math.min(fallback, total);
  const perLine = (room: number) => Math.max(Math.floor((room + gap) / (thumb + gap)), 0);
  const lastRoom = reserve > 0 ? width - reserve - gap : width;
  const slots = perLine(width) * (lines - 1) + perLine(lastRoom);
  if (slots >= total) return total;
  return Math.max(slots - 1, 0);
}

/** The copies no drawn tile stands for: what a strip's "+N" counts, in the label's unit. */
export function hiddenCopies(copies: number, shown: readonly { qty?: number }[]) {
  return Math.max(copies - shown.reduce((sum, item) => sum + (item.qty ?? 1), 0), 0);
}
