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

/** `null` resets a colour to the source's; an absent key keeps it. */
export const setCollectionColorsInputSchema = z
  .object({
    slug: z.string().min(1).max(255),
    textColor: hexColor.nullable().optional(),
    backgroundColor: hexColor.nullable().optional(),
  })
  .refine((input) => input.textColor !== undefined || input.backgroundColor !== undefined, {
    message: "no_color",
  });
export type SetCollectionColorsInput = z.infer<typeof setCollectionColorsInputSchema>;
