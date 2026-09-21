/**
 * Deterministic seeding shared by the offline fixtures, so a slug always
 * produces the same serials, transfers and listings across reloads.
 */

/** FNV-1a */
export function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h >>> 0;
}

/** mulberry32 — small deterministic PRNG */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A second, unrelated string hash (`h * 31 + charCode`) used to seed the fake
 * profiles and their addresses. It is not interchangeable with `hash` above:
 * both are deterministic, but each one's output is already baked into
 * fixtures and screenshots, so swapping either reshuffles the lab.
 */
export function hash31(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
