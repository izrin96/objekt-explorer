import * as z from "zod";

/** The web asks in chunks of this many ids. */
export const PRESENCE_BATCH_LIMIT = 100;
/** An active tab reports at most this often, so idle shows 10 to 11 minutes after the last activity. */
export const ACTIVE_REPORT_SECONDS = 60;

export const presenceOnlineInputSchema = z.object({
  userIds: z
    .array(z.string().min(1).max(64))
    .max(PRESENCE_BATCH_LIMIT)
    .transform((ids) => [...new Set(ids)]),
});
