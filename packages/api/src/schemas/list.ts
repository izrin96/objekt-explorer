import type { ListObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

import { addressInputSchema, addressSchema } from "./common/address";
import { artistsArraySchema } from "./common/artist";
import { indexedObjektSchema, ownedObjektSchema } from "./common/objekt";
import type { ObjektPreview } from "./objekts";
import { publicProfileSchema, publicUserSchema } from "./profile";

export const listTypeNewSchema = z.enum(["general", "sale", "have", "want"]);
export type ListTypeNew = z.infer<typeof listTypeNewSchema>;

/** Which side of a trade a list stands for: a sale list offers its objekts as a have list does. */
export function tradeSideOf(type: ListTypeNew): "have" | "want" | null {
  if (type === "want") return "want";
  return type === "have" || type === "sale" ? "have" : null;
}

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
  showOnTrade: z.boolean().nullish(),
  bumpedAt: z.string().nullish(),
  user: publicUserSchema.nullish(),
  profile: publicProfileSchema.nullish(),
});

export type ListPreview = ObjektPreview & { slug: string };

export const publicListSchema = baseListSchema.extend({
  linkedList: baseListSchema.nullish(),
});
export type PublicList = z.infer<typeof publicListSchema>;

export const findPublicOutputSchema = publicListSchema.nullable();
export const profileListsOutputSchema = z.array(publicListSchema);

const listEntryFields = {
  entryId: z.number(),
  price: z.number().nullable(),
  isQyop: z.boolean(),
  note: z.string().nullable(),
};

const listObjektSchema = z.union([
  ownedObjektSchema.extend(listEntryFields),
  indexedObjektSchema.extend(listEntryFields),
]) satisfies z.ZodType<ListObjekt>;

export const listEntriesOutputSchema = z.array(listObjektSchema);

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

export const listSlugInputSchema = z.object({ slug: z.string() });

export const listEntriesInputSchema = listSlugInputSchema.extend({
  artist: artistsArraySchema.default([]),
});

export const createListInputSchema = z.object({
  name: z.string().min(1).max(256),
  listTypeNew: listTypeNewSchema.default("general"),
  isProfileBind: z.boolean().default(false),
  hideSerial: z.boolean().default(false),
  linkedListId: z.number().nullable(),
  profileAddress: addressSchema.nullable(),
  description: z.string().max(5000).nullable(),
  currency: z.string().max(10).nullable(),
  discoverable: z.boolean().default(false),
  showOnTrade: z.boolean().optional(),
  matchAlerts: z.boolean().optional(),
});

export const editListInputSchema = z.object({
  slug: z.string(),
  name: z.string().min(1).max(256),
  gridColumns: z.number().min(2).max(18).nullable(),
  profileAddress: addressSchema.nullable(),
  description: z.string().max(5000).nullable(),
  currency: z.string().max(10).nullable(),
  hideSerial: z.boolean(),
  linkedListId: z.number().nullable(),
  discoverable: z.boolean(),
  showOnTrade: z.boolean().optional(),
  matchAlerts: z.boolean().optional(),
  regenerateSlug: z.boolean().default(false),
});

export const listPreviewsInputSchema = z.object({ slugs: z.string().array().max(500) });

/** `{ address }`, and also the `{ profileAddress }` that `/rpc` clients built before it send. */
export const profileListsInputSchema = z.preprocess(
  (value: { address: string } | { profileAddress: string }) =>
    typeof value === "object" && value !== null && !("address" in value)
      ? { address: value.profileAddress }
      : value,
  addressInputSchema,
);

export const addToListInputSchema = z.object({
  slug: z.string(),
  skipDups: z.boolean(),
  from: addSourceSchema,
});

export const removeObjektsFromListInputSchema = z.object({
  slug: z.string(),
  entryIds: z.number().int().positive().array().max(50000),
});

export const findTradePartnersInputSchema = z.object({
  slug: z.string(),
  mode: z.enum(["have-to-want", "want-to-have", "both"]).optional(),
});

export const updateEntryPricesInputSchema = z.object({
  slug: z.string(),
  updates: z
    .array(
      z.object({
        entryId: z.number(),
        price: z.number().min(0).nullable(),
        isQyop: z.boolean(),
        note: z.string().max(255).optional().nullable(),
      }),
    )
    .max(50000),
});

export const generateDiscordFormatInputSchema = z.object({
  haveListSlug: z.string().optional(),
  wantListSlug: z.string().optional(),
});
