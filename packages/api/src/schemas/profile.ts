import { acceptedFileMimeTypes } from "@repo/lib/media";
import * as z from "zod";

import { MAX_FILE_SIZE } from "../constants";
import { addressSchema } from "./common/address";

export const publicUserSchema = z.object({
  name: z.string().nullable(),
  image: z.string().nullable(),
  discord: z.string().nullable(),
  twitter: z.string().nullable(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const baseProfileSchema = z.object({
  address: z.string(),
  nickname: z.string().nullable(),
});

export const publicProfileSchema = baseProfileSchema.extend({
  isGuard: z.boolean().nullish(),
  bannerImgUrl: z.string().nullish(),
  bannerImgType: z.string().nullish(),
  gridColumns: z.number().nullish(),
  user: publicUserSchema.nullish(),
  verified: z.boolean().nullish(),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;

/** A profile's hover card: the public profile plus its counts, null when private or uncounted. */
export type ProfilePreview = PublicProfile & {
  counts: { objekts: number; collections: number } | null;
};

/** The banner URL must sit under `bannerUrlPrefix`, which comes from server config. */
export function makeEditProfileInputSchema(bannerUrlPrefix: string) {
  return z.object({
    address: addressSchema,
    hideUser: z.boolean(),
    bannerImgUrl: z
      .url()
      .max(512)
      .refine((url) => url.startsWith(bannerUrlPrefix))
      .nullish(),
    bannerImgType: z.string().max(50).nullish(),
    privateSerial: z.boolean(),
    privateProfile: z.boolean(),
    hideNickname: z.boolean(),
    hideTransfer: z.boolean(),
    gridColumns: z.number().min(2).max(18).nullable(),
  });
}

export const presignedPostInputSchema = z.object({
  address: addressSchema,
  fileName: z.string().min(1),
  mimeType: z.string().refine((val) => new Set<string>(acceptedFileMimeTypes).has(val)),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE),
});
