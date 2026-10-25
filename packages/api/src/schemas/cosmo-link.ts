import * as z from "zod";

import { addressSchema } from "./common/address";
import { artistSchema } from "./common/artist";

/** A linked Cosmo's card: its banner and its objekt count. */
export type LinkedPreview = {
  address: string;
  bannerImgUrl: string | null;
  bannerImgType: string | null;
  count: number;
};

export const linkedPreviewsInputSchema = z.object({ addresses: z.string().array().max(100) });

export const generateCodeInputSchema = z.object({
  address: addressSchema,
  cosmoId: z.number().int().positive(),
  nickname: z.string().min(1).max(24),
  artistId: artistSchema,
});

/** `data.reason` on a refused Cosmo link step. */
export const COSMO_LINK_REFUSALS = [
  "cosmo_link_already_linked_self",
  "cosmo_link_already_linked_other",
  "cosmo_link_rate_limit",
  "cosmo_link_verification_expired",
  "cosmo_link_profile_mismatch",
  "cosmo_link_code_not_found",
  "cosmo_link_address_restricted",
  "cosmo_link_cooldown",
  "cosmo_link_unlink_sanctioned",
  "cosmo_link_unlink_in_trade",
  "cosmo_link_not_yours",
] as const;
