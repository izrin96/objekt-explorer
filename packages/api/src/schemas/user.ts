import type { CosmoSearchResult } from "@repo/cosmo/types/user";
import * as z from "zod";

import type { User } from "../services/auth";
import { artistIdSchema } from "./common/artist";
import { publicListSchema } from "./list";
import { SANCTION_TYPES } from "./moderation";
import { baseProfileSchema } from "./profile";

export const providerIdSchema = z.enum(["twitter", "discord"]);
export type ProviderId = z.infer<typeof providerIdSchema>;

const providerSchema = z.object({
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

const currentUserOutputSchema = z
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

/**
 * Why an account can't be deleted yet: a sanction would end with it, a trade would lose a party,
 * no email can carry the link, or the sign-in is too old to delete without one. Bare codes,
 * unlike other refusals: Better Auth and `?refused=` carry them too.
 */
export const DELETE_REFUSALS = [
  "sanctioned",
  "trade_in_progress",
  "email_undeliverable",
  "sign_in_again",
] as const;
export type DeleteRefusal = (typeof DELETE_REFUSALS)[number];

export const isDeleteRefusal = (code: unknown): code is DeleteRefusal =>
  DELETE_REFUSALS.some((refusal) => refusal === code);

export const DELETION_STEPS = ["send-email", "delete", "sign-in-again"] as const;
export type DeletionStep = (typeof DELETION_STEPS)[number];

export const deletionCheckOutputSchema = z.object({
  blockers: z
    .discriminatedUnion("kind", [
      z.object({
        kind: z.literal("trade"),
        tradeId: z.number().int(),
        partner: z.object({ userId: z.string(), name: z.string() }),
        cancelLocked: z.boolean(),
        endsBy: z.iso.datetime(),
      }),
      z.object({
        kind: z.literal("sanction"),
        type: z.enum(SANCTION_TYPES),
        until: z.iso.datetime().nullable(),
      }),
    ])
    .array(),
  /** what deleting would cancel */
  openOffers: z.number().int(),
  step: z.enum(DELETION_STEPS),
});
export type DeletionCheck = z.infer<typeof deletionCheckOutputSchema>;

export const deletionTokenOutputSchema = z.object({ token: z.string() });

/** `data.reason` on a refused user search or provider refresh; `user_failed_get_info` also carries `data.provider`. */
export const USER_REFUSALS = [
  "user_query_too_long",
  "user_search_rate_limit",
  "user_not_linked_provider",
  "user_failed_get_info",
] as const;
