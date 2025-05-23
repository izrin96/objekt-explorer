import { TRPCError } from "@trpc/server";
import { auth } from "../../auth";
import { db } from "../../db";
import { authProcedure, createTRPCRouter } from "../trpc";

export const userRouter = createTRPCRouter({
  refreshProfile: authProcedure.mutation(
    async ({
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
          and(eq(t.userId, user.id), eq(t.providerId, "discord")),
      });

      if (!account)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User not link with Discord",
        });

      const authContext = await auth.$context;

      const provider = authContext.socialProviders.find(
        (p) => p.id === "discord"
      );

      // fetch from discord
      const info = await provider!.getUserInfo({
        idToken: account.idToken ?? undefined,
        accessToken: account.accessToken ?? undefined,
        refreshToken: account.refreshToken ?? undefined,
      });

      if (!info)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get info from Discord",
        });

      // update user
      await auth.api.updateUser({
        headers,
        body: {
          discord: info.data.username,
          image: info.user.image,
        },
      });
    }
  ),
});
