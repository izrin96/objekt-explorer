import * as z from "zod";

/** The web asks in chunks of this many ids. */
export const PRESENCE_BATCH_LIMIT = 100;

export const presenceOnlineInputSchema = z.object({
  userIds: z
    .array(z.string().min(1).max(64))
    .max(PRESENCE_BATCH_LIMIT)
    .transform((ids) => [...new Set(ids)]),
});
