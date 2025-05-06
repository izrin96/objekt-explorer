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

      if (!account) return false;

      const authContext = await auth.$context;

      const provider = authContext.socialProviders.find(
        (p) => p.id === "discord"
      );

      if (!provider) return false;

      // fetch from discord
      const info = await provider.getUserInfo({
        idToken: account.idToken ?? undefined,
        accessToken: account.accessToken ?? undefined,
        refreshToken: account.refreshToken ?? undefined,
      });

      if (!info) return false;

      // update user
      const result = await auth.api.updateUser({
        headers,
        body: {
          name: info.user.name,
          username: info.data.username,
          image: info.user.image,
        },
      });

      return result.status;
    }
  ),
});
