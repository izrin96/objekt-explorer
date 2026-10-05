import * as z from "zod";

export const statusOutputSchema = z.object({
  database: z.object({
    /** the newest indexed transfer, null when the indexer database is unreachable */
    latestTransferDate: z.string().nullable(),
    behind: z.boolean(),
  }),
  cosmo: z.object({ status: z.enum(["up", "partial", "down"]) }),
});
