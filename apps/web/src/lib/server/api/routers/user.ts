import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { user as userSchema } from "@repo/db/auth-schema";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import * as z from "zod";

import { providersMap } from "@/lib/universal/user";

import { auth } from "../../auth";
import { getUserLocale } from "../../locale";
import { authed } from "../orpc";

export const userRouter = {
  refreshProfile: authed.input(z.enum(["discord", "twitter"])).handler(
    async ({
      input: providerId,
      context: {
        session: { user },
      },
    }) => {
      const locale = await getUserLocale();
      const t = await getTranslations({ locale, namespace: "api_errors.user" });

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
          message: t("not_linked_provider"),
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
          message: t("failed_get_info", { provider: providersMap[providerId].label }),
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
};
