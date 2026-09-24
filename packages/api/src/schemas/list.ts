import * as z from "zod";

import { publicProfileSchema, publicUserSchema } from "./user";

export const listTypeNewSchema = z.enum(["general", "sale", "have", "want"]);
export type ListTypeNew = z.infer<typeof listTypeNewSchema>;

export const baseListSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  listTypeNew: listTypeNewSchema,
  isProfileBind: z.boolean(),
  profileSlug: z.string().nullable(),
  profileAddress: z.string().nullable(),
  currency: z.string().nullable(),
  // extras
  hideSerial: z.boolean().nullish(),
  gridColumns: z.number().nullish(),
  description: z.string().nullish(),
  discoverable: z.boolean().nullish(),
  user: publicUserSchema.nullish(),
  profile: publicProfileSchema.nullish(),
});

export const publicListSchema = baseListSchema.extend({
  linkedList: baseListSchema.nullish(),
});
export type PublicList = z.infer<typeof publicListSchema>;

/**
 * Where added objekts come from. A bound list takes tokens its profile owns and
 * expands collections to every copy it owns; any other list takes collections.
 */
export const addSourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("objekts"), tokenIds: z.string().array().min(1).max(50000) }),
  z.object({ type: z.literal("collections"), slugs: z.string().array().min(1).max(50000) }),
  // a bound list hiding serials hands out entries: its cards carry no token id
  z.object({
    type: z.literal("list"),
    slug: z.string(),
    entryIds: z.number().int().positive().array().min(1).max(50000),
  }),
]);
export type AddSource = z.infer<typeof addSourceSchema>;

// Trade match schemas
export const partnerListMatchSchema = z.object({
  listId: z.number(),
  listSlug: z.string(),
  listName: z.string(),
  profileAddress: z.string().nullable(),
  profileSlug: z.string().nullable(),
  profileNickname: z.string().nullable(),
  theyHaveIWant: z.string().array(),
  iHaveTheyWant: z.string().array(),
});
export type PartnerListMatch = z.infer<typeof partnerListMatchSchema>;

export const tradePartnerSchema = z.object({
  userId: z.string(),
  username: z.string(),
  user: publicUserSchema,
  matches: partnerListMatchSchema.array(),
});
export type TradePartner = z.infer<typeof tradePartnerSchema>;

export const tradePartnersResponseSchema = z.object({
  partners: tradePartnerSchema.array(),
  collections: z.record(z.string(), z.unknown()),
});
export type TradePartnersResponse = z.infer<typeof tradePartnersResponseSchema>;
