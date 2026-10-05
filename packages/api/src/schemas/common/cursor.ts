import * as z from "zod";

export const timestampCursorSchema = z.object({
  timestamp: z.string(),
  id: z.string(),
});
export type TimestampCursor = z.infer<typeof timestampCursorSchema>;

export const receivedAtCursorSchema = z.object({
  receivedAt: z.string(),
  id: z.string(),
});
