import * as z from "zod";

import type { User } from "../server/auth.server";

export const publicUserSchema = z.object({
  name: z.string().nullable(),
  image: z.string().nullable(),
  discord: z.string().nullable(),
  twitter: z.string().nullable(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const publicProfileSchema = z.object({
  isGuard: z.boolean(),
  address: z.string(),
  nickname: z.string().nullish(),
  bannerImgUrl: z.string().nullish(),
  bannerImgType: z.string().nullish(),
  gridColumns: z.number().nullish(),
  user: publicUserSchema.nullish(),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;

export const currentUserSchema = z
  .object({
    user: z.custom<User>(),
  })
  .nullable();
export type CurrentUser = z.infer<typeof currentUserSchema>;

export const providerIdSchema = z.enum(["twitter", "discord"]);
export type ProviderId = z.infer<typeof providerIdSchema>;

export const providerSchema = z.object({
  id: providerIdSchema,
  label: z.string(),
});
export type Provider = z.infer<typeof providerSchema>;

export const providersMap: Record<ProviderId, Provider> = {
  twitter: {
    id: "twitter",
    label: "Twitter (X)",
  },
  discord: {
    id: "discord",
    label: "Discord",
  },
};

export const publicListSchema = z.object({
  slug: z.string(),
  profileSlug: z.string().nullish(),
  name: z.string(),
  gridColumns: z.number().nullish(),
  listType: z.enum(["normal", "profile"]),
  profileAddress: z.string().nullish(),
  description: z.string().nullish(),
  currency: z.string().nullish(),
  user: publicUserSchema.nullish(),
});
export type PublicList = z.infer<typeof publicListSchema>;

export const listInfoSchema = z.object({
  listType: z.enum(["normal", "profile"]),
  slug: z.string(),
  profileSlug: z.string().nullish(),
  nickname: z.string().nullish(),
  profileAddress: z.string().nullish(),
});
export type ListInfo = z.infer<typeof listInfoSchema>;
