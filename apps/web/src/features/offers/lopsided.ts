export const LOPSIDED_RATIO = 5;

/** Accepting takes every objekt, so a side with far more than the other is worth a second look before it goes through. */
export function isLopsided(offer: { give: readonly unknown[]; get: readonly unknown[] }) {
  const { give, get } = offer;
  return (
    give.length > 0 &&
    get.length > 0 &&
    Math.max(give.length, get.length) >= LOPSIDED_RATIO * Math.min(give.length, get.length)
  );
}
