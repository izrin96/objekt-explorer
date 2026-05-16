import * as z from "zod";

export const publicUserSchema = z.object({
  name: z.string().nullable(),
  image: z.string().nullable(),
  username: z.string().nullable(),
  discord: z.string().nullable(),
  twitter: z.string().nullable(),
  displayUsername: z.string().nullable(),
  showSocial: z.boolean().nullable(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const publicProfileSchema = z.object({
  address: z.string(),
  nickname: z.string().nullish(),
  bannerImgUrl: z.string().nullish(),
  bannerImgType: z.string().nullish(),
  privateProfile: z.boolean().nullish(),
  gridColumns: z.number().nullish(),
  user: publicUserSchema.nullish(),
  ownerId: z.string().nullish(),
  isOwned: z.boolean().optional(),
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

export const publicListSchema = z.object({
  slug: z.string(),
  profileSlug: z.string().nullish(),
  name: z.string(),
  gridColumns: z.number().nullish(),
  user: publicUserSchema.nullish(),
  listType: z.enum(["normal", "profile"]),
  profileAddress: z.string().nullish(),
  ownerId: z.string().nullish(),
  isOwned: z.boolean().optional(),
  description: z.string().nullish(),
  currency: z.string().nullish(),
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
