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
