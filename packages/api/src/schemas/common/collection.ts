import * as z from "zod";

export const collectionSlugInputSchema = z.object({ collectionSlug: z.string() });
