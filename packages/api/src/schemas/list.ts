import type { ListObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

import { addressInputSchema, addressSchema } from "./common/address";
import { artistsArraySchema } from "./common/artist";
import { indexedObjektSchema, ownedObjektSchema } from "./common/objekt";
import type { ObjektPreview } from "./objekts";
import { publicProfileSchema, publicUserSchema } from "./profile";

const listTypeSchema = z.enum(["general", "sale", "have", "want"]);
export type ListType = z.infer<typeof listTypeSchema>;

/**
 * Whether the list's Show on Trade switch can be on: a want list any time, a have or sale list
 * only while bound to a Cosmo profile, since matching reads that profile's holdings.
 */
export function canBeOnTrade(type: ListType, isProfileBind: boolean) {
  return type === "want" || ((type === "have" || type === "sale") && isProfileBind);
}

/** Which side of a trade a list stands for: a sale list offers its objekts as a have list does. */
export function tradeSideOf(type: ListType): "have" | "want" | null {
  if (type === "want") return "want";
  return type === "have" || type === "sale" ? "have" : null;
}

type TradeListRef = { id: number; listType: ListType; linkedListId: number | null };

/**
 * The sides a list compares when it is picked on its own: its own, and the other side when it
 * links to a list in `onTrade` that stands for it. With no such link it compares one way.
 */
export function pickedSides<L extends TradeListRef>(list: L, onTrade: readonly L[]) {
  const own = tradeSideOf(list.listType);
  const paired = onTrade.find((other) => {
    const side = tradeSideOf(other.listType);
    return other.id === list.linkedListId && side !== null && side !== own;
  });
  const ids = (side: "have" | "want") =>
    [list, paired].flatMap((l) => (l && tradeSideOf(l.listType) === side ? [l.id] : []));
  return { haveListIds: ids("have"), wantListIds: ids("want"), paired };
}

const baseListSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  listType: listTypeSchema,
  isProfileBind: z.boolean(),
  profileSlug: z.string().nullable(),
  profileAddress: z.string().nullable(),
  currency: z.string().nullable(),
  // extras
  hideSerial: z.boolean().nullish(),
  gridColumns: z.number().nullish(),
  description: z.string().nullish(),
  discoverable: z.boolean().nullish(),
  matchSale: z.boolean().nullish(),
  matchHave: z.boolean().nullish(),
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
const addSourceSchema = z.discriminatedUnion("type", [
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
const partnerListMatchSchema = z.object({
  listId: z.number(),
  listSlug: z.string(),
  listName: z.string(),
  profileAddress: z.string().nullable(),
  profileSlug: z.string().nullable(),
  profileNickname: z.string().nullable(),
  theyHaveIWant: z.string().array(),
  iHaveTheyWant: z.string().array(),
});

const tradePartnerSchema = z.object({
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

const createListFields = z.object({
  name: z.string().min(1).max(256),
  listType: listTypeSchema.default("general"),
  isProfileBind: z.boolean().default(false),
  hideSerial: z.boolean().default(false),
  linkedListId: z.number().nullable(),
  profileAddress: addressSchema.nullable(),
  description: z.string().max(5000).nullable(),
  currency: z.string().max(10).nullable(),
  discoverable: z.boolean().default(false),
  matchSale: z.boolean().default(false),
  matchHave: z.boolean().default(true),
});

/** Also takes the `listTypeNew` that `/rpc` clients built before the rename send, which the `general` default would otherwise swallow. */
function withLegacyListType(value: unknown) {
  if (typeof value !== "object" || value === null || "listType" in value) return value;
  if (!("listTypeNew" in value)) return value;
  const { listTypeNew, ...rest } = value;
  return { ...rest, listType: listTypeNew };
}

export const createListInputSchema = z.preprocess(withLegacyListType, createListFields);

export const copyListInputSchema = z.preprocess(
  withLegacyListType,
  createListFields.extend({ sourceSlug: z.string() }),
);

export const copyPreviewInputSchema = z.object({
  sourceSlug: z.string(),
  listType: listTypeSchema,
  isProfileBind: z.boolean(),
  profileAddress: addressSchema.nullable(),
});

/** Collections where entries are carried as collections, copies where each entry is one copy. */
const copyCountsSchema = z.object({
  carried: z.number(),
  leftOut: z.number(),
  unit: z.enum(["collections", "copies"]),
});

export const copyPreviewOutputSchema = copyCountsSchema;
export const copyListOutputSchema = copyCountsSchema.extend({ slug: z.string() });

export const editListInputSchema = z.object({
  slug: z.string(),
  name: z.string().min(1).max(256),
  gridColumns: z.number().min(2).max(18).nullable(),
  profileAddress: addressSchema.nullable(),
  description: z.string().max(5000).nullable(),
  currency: z.string().max(10).nullable(),
  hideSerial: z.boolean(),
  // optional: the post composer sets a have or want list's link and Trade state, so the list form
  // leaves them out and the list keeps its own; `null` is still an unlink
  linkedListId: z.number().nullable().optional(),
  discoverable: z.boolean().optional(),
  // optional: a tab opened before the switch existed leaves the list's setting alone
  matchSale: z.boolean().optional(),
  matchHave: z.boolean().optional(),
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

/** `data.reason` on a refused list create or edit, price update or entry copy. */
export const LIST_REFUSALS = [
  "list_linked_not_found",
  "list_have_links_want",
  "list_want_links_have",
  "list_pair_buying_only",
  "list_collections_required",
  "list_currency_required",
  "list_profile_required",
  "list_prices_sale_only",
] as const;
