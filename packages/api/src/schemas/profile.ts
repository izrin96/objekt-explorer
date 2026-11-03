import { acceptedFileMimeTypes } from "@repo/lib/media";
import * as z from "zod";

import { MAX_FILE_SIZE } from "../constants";
import { addressSchema } from "./common/address";
import { reputationSchema } from "./reputation";

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
  /** whether the profile offers Message to this viewer; set only by the profile page's read */
  messageable: z.boolean().nullish(),
  /** the owner's account id, set by the profile page's read only when `user` is shown */
  userId: z.string().optional(),
  /** the owner's reputation, set with `userId` only */
  reputation: reputationSchema.optional(),
  /** set by the profile page's read only, and only when `user` is shown */
  bio: z.string().nullable().optional(),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;

/** A profile's hover card: the public profile plus its counts, null when private or uncounted. */
export const profilePreviewOutputSchema = publicProfileSchema.extend({
  counts: z.object({ objekts: z.number(), collections: z.number() }).nullable(),
});
export type ProfilePreview = z.infer<typeof profilePreviewOutputSchema>;

export const BIO_MAX_LENGTH = 160;

// bidi embedding, override and isolate marks can make a bio read as someone else's text
const HIDDEN_CHARS = /(?!\n)[\p{Cc}\u202A-\u202E\u2066-\u2069]/gu;
// a line of only spaces or invisible fillers (zero-width marks, Hangul fillers, the blank
// Braille cell) reads as empty; ZWJ alone stays legal inside text, since emoji need it
const BLANK_LINE = /^[\s\u115F\u1160\u200B-\u200D\u2060\u2800\u3164\uFEFF\uFFA0]*$/u;

/** The stored form of a bio, or null when nothing is left to show. */
export function normalizeBio(text: string): string | null {
  const bio = text
    .replace(/\r\n?/g, "\n")
    .replace(HIDDEN_CHARS, "")
    .split("\n")
    .map((line) => (BLANK_LINE.test(line) ? "" : line.trimEnd()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return bio === "" ? null : bio;
}

/** The banner URL must sit under `bannerUrlPrefix`, which comes from server config. */
export function makeEditProfileInputSchema(bannerUrlPrefix: string) {
  return z.object({
    address: addressSchema,
    bannerImgUrl: z
      .url()
      .max(512)
      .refine((url) => url.startsWith(bannerUrlPrefix))
      .nullish(),
    bannerImgType: z.string().max(50).nullish(),
    gridColumns: z.int().min(2).max(18).nullable(),
    // absent (a tab from before bios) keeps the stored bio; only null or blank text clears it
    bio: z
      .string()
      .max(BIO_MAX_LENGTH * 4)
      .nullish()
      .transform((bio) => (typeof bio === "string" ? normalizeBio(bio) : bio))
      .pipe(z.string().max(BIO_MAX_LENGTH).nullish()),
  });
}

export const presignedPostInputSchema = z.object({
  address: addressSchema,
  fileName: z.string().min(1),
  mimeType: z.string().refine((val) => new Set<string>(acceptedFileMimeTypes).has(val)),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE),
});

/** `data.reason` on a profile read or edit the signed-in user doesn't own. */
export const PROFILE_REFUSALS = ["profile_not_linked", "profile_not_found"] as const;
