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
