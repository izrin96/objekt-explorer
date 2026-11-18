export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** A timestamp as ISO 8601, keeping null. */
export const iso = (at: string | null) => (at === null ? null : new Date(at).toISOString());
