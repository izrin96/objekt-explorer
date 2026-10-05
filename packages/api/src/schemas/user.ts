import type { CosmoSearchResult } from "@repo/cosmo/types/user";
import * as z from "zod";

import type { User } from "../services/auth";
import { artistIdSchema } from "./common/artist";
import { publicListSchema } from "./list";
import { baseProfileSchema } from "./profile";

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

export const currentUserOutputSchema = z
  .object({
    user: z.custom<User>(),
    lists: publicListSchema.array(),
    profiles: baseProfileSchema.array(),
  })
  .nullable();
export type CurrentUserOutput = z.infer<typeof currentUserOutputSchema>;

/** longer than any nickname or address; the server refuses past it */
export const MAX_USER_SEARCH_LENGTH = 50;

export const userSearchInputSchema = z.object({ query: z.string().default("") });

export const updateAccountInputSchema = z.object({
  name: z.string().min(1).max(256),
  showSocial: z.boolean(),
  removePic: z.boolean(),
});

const cosmoProfileSchema = z.object({
  artistId: artistIdSchema,
  artistName: artistIdSchema,
  image: z.object({ original: z.string(), thumbnail: z.string() }),
});

export const userSearchOutputSchema = z.object({
  hasNext: z.boolean(),
  nextStartAfter: z.string().nullable(),
  results: z.array(
    z.object({
      id: z.number().int(),
      nickname: z.string(),
      profileImageUrl: z.string(),
      address: z.string(),
      userProfiles: z.array(cosmoProfileSchema),
    }),
  ),
}) satisfies z.ZodType<CosmoSearchResult>;
