/**
 * Token ids `from..to` as text ranges of one digit length each. Ids are varchar,
 * and text order is numeric order only between ids of the same length, so a
 * window that crosses a power of ten (9,999,950..10,000,049) splits in two.
 */
export function tokenIdWindow(from: number, to: number) {
  const spans: { length: number; lo: string; hi: string }[] = [];
  let lo = from;
  while (lo <= to) {
    const length = String(lo).length;
    const hi = Math.min(to, 10 ** length - 1);
    spans.push({ length, lo: String(lo), hi: String(hi) });
    lo = hi + 1;
  }
  return spans;
}
