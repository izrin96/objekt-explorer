import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { user as userSchema } from "@repo/db/auth-schema";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

import { authed, pub } from "../orpc";
import { documented, errorResponses } from "../schemas/common/documented";
import {
  providerIdSchema,
  providersMap,
  updateAccountInputSchema,
  userSearchInputSchema,
  userSearchOutputSchema,
} from "../schemas/user";
import { refreshProviderProfile } from "../services/auth";
import { isIpRateLimited } from "../services/redis";
import { getCurrentUser } from "../services/user";
import { MAX_USER_SEARCH_LENGTH, searchUsers } from "../services/user-search";

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
        throw new ORPCError("BAD_REQUEST", { message: "Query too long" });
      }
      if (await isIpRateLimited("user-search", context.headers ?? getRequestHeaders())) {
        throw new ORPCError("TOO_MANY_REQUESTS");
      }
      return searchUsers(query);
    }),

  refreshProfile: authed
    // typed, so the client can send the user back through the provider for a fresh token
    .errors({ REAUTH_REQUIRED: { status: 400 } })
    .input(providerIdSchema)
    .handler(
      async ({
        input: providerId,
        context: {
          messages,
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
          throw new ORPCError("BAD_REQUEST", {
            message: messages.user_not_linked_provider(),
          });

        if (!(await refreshProviderProfile(account)))
          throw errors.REAUTH_REQUIRED({
            message: messages.user_failed_get_info({
              provider: providersMap[providerId].label,
            }),
          });
      },
    ),

  currentUser: pub.handler(getCurrentUser),

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
