import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { user as userSchema } from "@repo/db/auth-schema";
import { eq } from "drizzle-orm";
import * as z from "zod";

import { providersMap } from "@/lib/universal/user";
import { m } from "@/paraglide/messages";

import { auth, getCurrentUser } from "../../auth.server";
import { authed, pub } from "../orpc";

export const userRouter = {
  refreshProfile: authed.input(z.enum(["discord", "twitter"])).handler(
    async ({
      input: providerId,
      context: {
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
          message: m.api_errors_user_not_linked_provider(),
        });

      const authContext = await auth.$context;

      const provider = authContext.socialProviders.find((p) => p.id === providerId);

      if (!provider) {
        throw new ORPCError("BAD_REQUEST", {
          message: m.api_errors_user_not_linked_provider(),
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
          message: m.api_errors_user_failed_get_info({
            provider: providersMap[providerId].label,
          }),
        });

      // update user
      await db
        .update(userSchema)
        .set({
          [providerId]: providerId === "discord" ? info.data.username : info.data.data?.username,
          image: info.user.image,
        })
        .where(eq(userSchema.id, user.id));
    },
  ),

  unlinkAccount: authed
    .input(
      z.object({
        providerId: z.enum(["discord", "twitter"]),
        accountId: z.string().min(1).max(64),
      }),
    )
    .handler(
      async ({
        input: { providerId, accountId },
        context: {
          headers,
          session: { user },
        },
      }) => {
        // unlink using auth api
        const result = await auth.api.unlinkAccount({
          headers: headers,
          body: {
            providerId: providerId,
            accountId: accountId,
          },
        });

        if (!result.status) throw new ORPCError("INTERNAL_SERVER_ERROR");

        // remove username
        await db
          .update(userSchema)
          .set({
            [providerId]: null,
          })
          .where(eq(userSchema.id, user.id));
      },
    ),

  currentUser: pub.handler(getCurrentUser),

  updateAccount: authed
    .input(
      z.object({
        name: z.string().min(1).max(256),
        showSocial: z.boolean(),
        removePic: z.boolean(),
      }),
    )
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
