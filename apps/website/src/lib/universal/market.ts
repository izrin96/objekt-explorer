import * as z from "zod";

export const sortBySchema = z.enum(["price", "createdAt"]);
export type SortBy = z.infer<typeof sortBySchema>;

export const sortDirSchema = z.enum(["asc", "desc"]);
export type SortDir = z.infer<typeof sortDirSchema>;

/**
 * Minimal list info for constructing {@link getListLinkOption}.
 * Only includes the fields `getListLinkOption` reads.
 */
export const marketListInfoSchema = z.object({
  slug: z.string(),
  profileSlug: z.string().nullable(),
  profile: z
    .object({
      nickname: z.string().nullable(),
      address: z.string(),
    })
    .nullable(),
});

export const marketListingSchema = z.object({
  id: z.number(),
  price: z.number().nullable(),
  isQyop: z.boolean(),
  note: z.string().nullable(),
  createdAt: z.string(),
  currency: z.string().nullable(),
  usdPrice: z.number().nullable(),
  serial: z.number().nullable(),
  transferable: z.boolean().nullable(),
  list: marketListInfoSchema,
});

export type MarketListing = z.infer<typeof marketListingSchema>;

export const marketResultSchema = z.object({
  items: z.array(marketListingSchema),
  hasMore: z.boolean(),
  nextOffset: z.number().optional(),
});

export type MarketResult = z.infer<typeof marketResultSchema>;
