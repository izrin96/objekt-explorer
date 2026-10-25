import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { user as userSchema } from "@repo/db/auth-schema";
import { offer } from "@repo/db/schema";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { generateRandomString } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import * as z from "zod";

import { deletionBlockers, deletionStep, refusalOf } from "../lib/account-deletion";
import { refuse } from "../lib/refuse";
import { authed, pub } from "../orpc";
import { documented, errorResponses } from "../schemas/common/documented";
import {
  deletionCheckOutputSchema,
  deletionTokenOutputSchema,
  MAX_USER_SEARCH_LENGTH,
  providerIdSchema,
  providersMap,
  updateAccountInputSchema,
  userSearchInputSchema,
  userSearchOutputSchema,
} from "../schemas/user";
import { deletionState } from "../services/account-delete";
import { auth, refreshProviderProfile } from "../services/auth";
import { loadIdentities } from "../services/identities";
import { offersOf, openOffersWhere } from "../services/offer/cancel";
import { isIpRateLimited } from "../services/redis";
import { getCurrentUser } from "../services/user";
import { searchUsers } from "../services/user-search";

const DELETION_TOKEN_MINUTES = 5;

async function deletionCheck(session: {
  user: { id: string; email: string };
  session: { createdAt: Date };
}) {
  const userId = session.user.id;
  const now = new Date();
  const [state, [open]] = await Promise.all([
    deletionState(db, userId),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(offer)
      .where(openOffersWhere(offersOf(userId))),
  ]);
  const blockers = deletionBlockers({ ...state, now });
  return {
    blockers,
    openOffers: open?.count ?? 0,
    step: deletionStep(session.user.email, session.session.createdAt, now),
  };
}

export const userRouter = {
  search: pub
    .route({
      method: "GET",
      path: "/users/search",
      tags: ["Users"],
      summary: "Find Cosmo users by nickname",
      spec: errorResponses(400, 429),
    })
    .input(userSearchInputSchema)
    .output(documented(userSearchOutputSchema, { open: true }))
    .handler(async ({ input: { query }, context }) => {
      if (query.length < 1) return searchUsers(query);
      if (query.length > MAX_USER_SEARCH_LENGTH) {
        refuse("BAD_REQUEST", "user_query_too_long", "Query too long");
      }
      if (await isIpRateLimited("user-search", context.headers ?? getRequestHeaders())) {
        refuse(
          "TOO_MANY_REQUESTS",
          "user_search_rate_limit",
          "Too many searches, try again shortly",
        );
      }
      return searchUsers(query);
    }),

  refreshProfile: authed
    // typed, so the client can send the user back through the provider for a fresh token
    .errors({
      REAUTH_REQUIRED: {
        status: 400,
        data: z.object({ reason: z.literal("user_failed_get_info"), provider: z.string() }),
      },
    })
    .input(providerIdSchema)
    .handler(
      async ({
        input: providerId,
        context: {
          session: { user },
        },
        errors,
      }) => {
        const account = await db.query.account.findFirst({
          columns: {
            userId: true,
            providerId: true,
            idToken: true,
            accessToken: true,
            refreshToken: true,
          },
          where: { userId: user.id, providerId },
        });

        if (!account)
          refuse(
            "BAD_REQUEST",
            "user_not_linked_provider",
            "Account is not linked to this social provider",
          );

        if (!(await refreshProviderProfile(account)))
          throw errors.REAUTH_REQUIRED({
            message: "Failed to get info, sign in with the provider and try again",
            data: { reason: "user_failed_get_info", provider: providersMap[providerId].label },
          });
      },
    ),

  currentUser: pub.handler(getCurrentUser),

  deletionCheck: authed.output(deletionCheckOutputSchema).handler(async ({ context }) => {
    const check = await deletionCheck(context.session);
    const identities = await loadIdentities(
      check.blockers.flatMap((b) => (b.kind === "trade" ? [b.partnerId] : [])),
    );
    return {
      ...check,
      blockers: check.blockers.map((b) =>
        b.kind === "trade"
          ? {
              kind: b.kind,
              tradeId: b.tradeId,
              partner: {
                userId: b.partnerId,
                name: identities.get(b.partnerId)?.identity.name ?? "",
              },
              cancelLocked: b.cancelLocked,
              endsBy: b.endsBy.toISOString(),
            }
          : { kind: b.kind, type: b.type, until: b.until?.toISOString() ?? null },
      ),
    };
  }),

  /**
   * Delete now, for an account no email can reach: a Better Auth deletion token, minted as
   * `/delete-user` mints the emailed one, which `deleteUser({ token })` spends.
   */
  deletionToken: authed.output(deletionTokenOutputSchema).handler(async ({ context }) => {
    const { blockers, step } = await deletionCheck(context.session);
    const refusal = refusalOf(blockers);
    if (refusal) refuse("BAD_REQUEST", refusal, "Finish what blocks deletion first");
    if (step === "sign-in-again") {
      refuse("BAD_REQUEST", "sign_in_again", "Sign in again to delete without an email");
    }
    if (step === "send-email") throw new ORPCError("FORBIDDEN");
    const token = generateRandomString(32, "0-9", "a-z");
    const { internalAdapter } = await auth.$context;
    await internalAdapter.createVerificationValue({
      value: context.session.user.id,
      identifier: `delete-account-${token}`,
      expiresAt: new Date(Date.now() + DELETION_TOKEN_MINUTES * 60 * 1000),
    });
    return { token };
  }),

  updateAccount: authed
    .input(updateAccountInputSchema)
    .handler(async ({ input, context: { session } }) => {
      await db
        .update(userSchema)
        .set({
          name: input.name,
          showSocial: input.showSocial,
          image: input.removePic ? null : undefined,
          removeImage: input.removePic,
        })
        .where(eq(userSchema.id, session.user.id));
    }),
};
