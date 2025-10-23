import { ORPCError } from "@orpc/server";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import * as z from "zod/v4";
import { providersMap } from "@/lib/universal/user";
import { auth } from "../../auth";
import { db } from "../../db";
import { user as userSchema } from "../../db/auth-schema";
import { authed } from "../orpc";

export const userRouter = {
  refreshProfile: authed.input(z.object({ providerId: z.enum(["discord", "twitter"]) })).handler(
    async ({
      input: { providerId },
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
        where: (t, { eq, and }) => and(eq(t.userId, user.id), eq(t.providerId, providerId)),
      });

      if (!account)
        throw new ORPCError("BAD_REQUEST", {
          message: "User not link with provider",
        });

      const authContext = await auth.$context;

      const provider = authContext.socialProviders.find((p) => p.id === providerId);

      // fetch from provider
      const info = await provider!.getUserInfo({
        idToken: account.idToken ?? undefined,
        accessToken: account.accessToken ?? undefined,
        refreshToken: account.refreshToken ?? undefined,
      });

      if (!info)
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: `Failed to get info. Please sign in with ${providersMap[providerId].label} and try again.`,
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
        accountId: z.string(),
      }),
    )
    .handler(
      async ({
        input: { providerId, accountId },
        context: {
          session: { user },
        },
      }) => {
        // unlink using auth api
        const result = await auth.api.unlinkAccount({
          headers: getRequestHeaders(),
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
};
