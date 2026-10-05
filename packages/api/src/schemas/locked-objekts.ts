import * as z from "zod";

export const lockedObjektsOutputSchema = z.array(z.object({ tokenId: z.string() }));
