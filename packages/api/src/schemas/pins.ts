import * as z from "zod";

export const pinsOutputSchema = z.array(z.object({ tokenId: z.string(), order: z.number() }));
