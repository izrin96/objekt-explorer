import * as z from "zod";

import { addressSchema } from "./common/address";
import { modReasonSchema } from "./moderation";

export const ADMIN_REFUSALS = [
  "admin_collection_not_found",
  "admin_banner_changed",
  "admin_staff_target",
] as const;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** A colour as stored: `#` and six hex digits, lowercase; null for anything else. */
export function parseHexColor(value: string): string | null {
  const trimmed = value.trim();
  return HEX_COLOR.test(trimmed) ? trimmed.toLowerCase() : null;
}

export const hexColor = z
  .string()
  .refine((value) => parseHexColor(value) !== null, { message: "hex_color" })
  .transform((value) => parseHexColor(value)!);

export const BANNER_PAGE_SIZE = 30;

/** The last tile of the previous page; a null `at` pages within the banners with no time. */
const bannerCursorSchema = z.object({
  at: z.string().nullable(),
  id: z.number().int().positive(),
});
export type BannerCursor = z.infer<typeof bannerCursorSchema>;

export const bannersInputSchema = z.object({ cursor: bannerCursorSchema.optional() });

export const removeBannerInputSchema = z.object({
  address: addressSchema,
  /** the banner the moderator saw; a different one on the row refuses the removal */
  bannerImgUrl: z.string().min(1),
  reason: modReasonSchema,
});
export type RemoveBannerInput = z.infer<typeof removeBannerInputSchema>;

export const collectionSlugSchema = z.object({ slug: z.string().min(1).max(255) });

const colourChange = {
  textColor: hexColor.nullable().optional(),
  backgroundColor: hexColor.nullable().optional(),
  textPinned: z.boolean().optional(),
  backgroundPinned: z.boolean().optional(),
};

const changesSomething = (input: {
  textColor?: unknown;
  backgroundColor?: unknown;
  textPinned?: unknown;
  backgroundPinned?: unknown;
}) =>
  input.textColor !== undefined ||
  input.backgroundColor !== undefined ||
  input.textPinned !== undefined ||
  input.backgroundPinned !== undefined;

const slugSchema = z.string().min(1).max(255);

/**
 * `null` resets a colour (to Cosmo's text colour when one is recorded, else the source's); an
 * absent key keeps it. A pin applies to the colour's override after the save.
 */
export const setCollectionColorsInputSchema = z
  .object({ slug: slugSchema, ...colourChange })
  .refine(changesSomething, { message: "no_color" });
export type SetCollectionColorsInput = z.infer<typeof setCollectionColorsInputSchema>;

export const COLLECTION_BATCH_LIMIT = 50;

/** A row's overrides as the list showed them; a row that no longer matches is skipped. */
const expectedOverridesSchema = z.object({
  textColor: z.string().nullable(),
  backgroundColor: z.string().nullable(),
  textPinned: z.boolean(),
  backgroundPinned: z.boolean(),
});

/**
 * One group's Pin or Reset, or one applied suggestion: each entry is saved as `setCollectionColors`
 * saves one slug. `from` names the read members a suggestion came from, and makes the entry apply
 * only while its slug has no recorded text colour.
 */
export const setCollectionColorsManyInputSchema = z.object({
  entries: z
    .array(
      z
        .object({
          slug: slugSchema,
          ...colourChange,
          expected: expectedOverridesSchema,
          from: z.array(slugSchema).min(1).max(COLLECTION_BATCH_LIMIT).optional(),
        })
        .refine(changesSomething, { message: "no_color" }),
    )
    .min(1)
    .max(COLLECTION_BATCH_LIMIT),
});
export type SetCollectionColorsManyInput = z.infer<typeof setCollectionColorsManyInputSchema>;
