import * as z from "zod";

const TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[ T]([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d{1,6})?(Z|[+-](?:[01]\d|2[0-3])(?::?[0-5]\d)?)$/;

/** A timestamp as Postgres writes it (`2026-10-17 00:00:00.123456+00`) or as ISO 8601, a real calendar day. */
export function isTimestamp(value: string) {
  const match = TIMESTAMP_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  // Postgres has no year 0
  if (Number(year) === 0) return false;
  // setUTCFullYear, since Date.UTC reads years 0 to 99 as 19xx
  const date = new Date(0);
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  return date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day);
}

/** A cursor timestamp, checked before it reaches a `::timestamptz` cast or a timestamp column. */
export const timestampTextSchema = z.string().refine(isTimestamp, "Not a timestamp");

export const timestampCursorSchema = z.object({
  timestamp: timestampTextSchema,
  // a `transfer.id`, cast `::uuid` by the activity feed
  id: z.guid(),
});
export type TimestampCursor = z.infer<typeof timestampCursorSchema>;

export const receivedAtCursorSchema = z.object({
  receivedAt: timestampTextSchema,
  id: z.string(),
});
