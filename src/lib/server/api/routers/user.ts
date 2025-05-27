import { TRPCError } from "@trpc/server";
import { auth } from "../../auth";
import { db } from "../../db";
import { authProcedure, createTRPCRouter } from "../trpc";
import { z } from "zod/v4";

export const userRouter = createTRPCRouter({
  refreshProfile: authProcedure.input(z.string()).mutation(
    async ({
      input: providerId,
      ctx: {
        session: { user },
        headers,
      },
    }) => {
      // get accessToken from account
      const account = await db.query.account.findFirst({
        columns: {
          idToken: true,
          accessToken: true,
          refreshToken: true,
        },
        where: (t, { eq, and }) =>
          and(eq(t.userId, user.id), eq(t.providerId, providerId)),
      });

      if (!account)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User not link with provider",
        });

      const authContext = await auth.$context;

      const provider = authContext.socialProviders.find(
        (p) => p.id === providerId
      );

      // fetch from provider
      const info = await provider!.getUserInfo({
        idToken: account.idToken ?? undefined,
        accessToken: account.accessToken ?? undefined,
        refreshToken: account.refreshToken ?? undefined,
      });

      if (!info)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get info from provider",
        });

      // update user
      await auth.api.updateUser({
        headers,
        body: {
          [providerId]:
            providerId === "discord"
              ? info.data.username
              : info.data.data?.username,
          image: info.user.image,
        },
      });
    }
  ),

  unlinkAccount: authProcedure
    .input(
      z.object({
        providerId: z.string(),
        accountId: z.string(),
      })
    )
    .mutation(
      async ({ input: { providerId, accountId }, ctx: { headers } }) => {
        // unlink using auth api
        const result = await auth.api.unlinkAccount({
          headers: headers,
          body: {
            providerId: providerId,
            accountId: accountId,
          },
        });

        if (!result.status)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
          });

        // remove username
        await auth.api.updateUser({
          headers,
          body: {
            [providerId]: null,
          },
        });
      }
    ),
});
