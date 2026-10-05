import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { user as userSchema } from "@repo/db/auth-schema";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

import { authed, pub } from "../orpc";
import { documented } from "../schemas/common/documented";
import {
  providerIdSchema,
  providersMap,
  updateAccountInputSchema,
  userSearchInputSchema,
  userSearchOutputSchema,
} from "../schemas/user";
import { auth, getProviderUsername } from "../services/auth";
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

  refreshProfile: authed.input(providerIdSchema).handler(
    async ({
      input: providerId,
      context: {
        messages,
        session: { user },
      },
    }) => {
      // get accessToken from account
      const account = await db.query.account.findFirst({
        columns: {
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

      const authContext = await auth.$context;

      const provider = authContext.socialProviders.find((p) => p.id === providerId);

      if (!provider) {
        throw new ORPCError("BAD_REQUEST", {
          message: messages.user_not_linked_provider(),
        });
      }

      // fetch from provider
      const info = await provider.getUserInfo({
        idToken: account.idToken ?? undefined,
        accessToken: account.accessToken ?? undefined,
        refreshToken: account.refreshToken ?? undefined,
      });

      if (!info)
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: messages.user_failed_get_info({
            provider: providersMap[providerId].label,
          }),
        });

      // update user
      await db
        .update(userSchema)
        .set({
          [providerId]: getProviderUsername(providerId, info),
          image: info.user.image,
        })
        .where(eq(userSchema.id, user.id));
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
