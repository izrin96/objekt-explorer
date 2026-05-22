import * as z from "zod";

import type { User } from "../server/auth.server";

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
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;

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

export const baseListSchema = z.object({
  slug: z.string(),
  name: z.string(),
  listType: z.enum(["normal", "profile"]),
  profileSlug: z.string().nullable(),
  profileAddress: z.string().nullable(),
});

export const publicListSchema = baseListSchema.extend({
  gridColumns: z.number().nullish(),
  description: z.string().nullish(),
  currency: z.string().nullish(),
  user: publicUserSchema.nullish(),
  profile: publicProfileSchema.nullish(),
});
export type PublicList = z.infer<typeof publicListSchema>;

export const currentUserSchema = z
  .object({
    user: z.custom<User>(),
    lists: publicListSchema.array(),
    profiles: baseProfileSchema.array(),
  })
  .nullable();
export type CurrentUser = z.infer<typeof currentUserSchema>;
