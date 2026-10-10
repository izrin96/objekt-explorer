import * as z from "zod";

/** Completed and unfinished trades, the positive share of non-neutral ratings, and the account's month. */
export const reputationSchema = z.object({
  verified: z.number(),
  /** failed trades where the account, or a wallet it has linked, still owed a transfer; the default reads an entry cached before it existed */
  unfinished: z.number().default(0),
  /** 0–100, null until there is a positive or negative rating */
  positive: z.number().nullable(),
  /** `YYYY-MM` of the account's creation */
  since: z.string(),
});
export type Reputation = z.infer<typeof reputationSchema>;

export const reputationKey = (userId: string) => `rep:${userId}`;
