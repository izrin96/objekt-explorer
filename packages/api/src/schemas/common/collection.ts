import * as z from "zod";

export const collectionSlugInputSchema = z.object({
  collectionSlug: z
    .string()
    .meta({ description: "The collection's slug, such as `atom01-seoyeon-101z`" }),
});
