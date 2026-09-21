/**
 * localStorage that cannot throw. Private mode, blocked site data and quota
 * errors all fall back to the default rather than taking the page down.
 */
export function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    // storage blocked — the preference just does not stick
    return false;
  }
}

export function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // storage blocked — nothing to do
  }
}

/**
 * A list of ids under one key. Anything that is not an array of strings —
 * a hand-edited value, a key an older build wrote — reads as `null` rather
 * than as a half-valid order, so the caller falls back to its own seed.
 */
export function readStringArray(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((v) => typeof v !== "string")) return null;
    return parsed as string[];
  } catch {
    // storage blocked or the value is not JSON — fall back to the seed
    return null;
  }
}

export function writeStringArray(key: string, value: readonly string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked — the order just does not stick
  }
}
