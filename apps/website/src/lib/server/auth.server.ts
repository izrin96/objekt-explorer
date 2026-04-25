import { i18n } from "@better-auth/i18n";
import { fetchByNickname } from "@repo/cosmo/server/user";
import { db } from "@repo/db";
import * as authSchema from "@repo/db/auth-schema";
import { userAddress } from "@repo/db/schema";
import { isAddress } from "@repo/lib";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { username } from "better-auth/plugins/username";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { FetchError } from "ofetch";

import { betterAuthLocale } from "@/i18n/better-auth";
import { serverEnv } from "@/lib/env/server";

import type { PublicProfile, PublicUser } from "../universal/user";
import { getBaseURL, SITE_NAME } from "../utils";
import { getUserLocale } from "./locale.server";
import {
  sendDeleteAccountVerification,
  sendResetPassword,
  sendVerificationEmail,
} from "./mail.server";

export const auth = betterAuth({
  appName: SITE_NAME,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  plugins: [
    username(),
    i18n({
      defaultLocale: "en",
      translations: betterAuthLocale,
      detection: ["callback", "cookie"],
      localeCookie: "NEXT_LOCALE",
      getLocale: () => {
        return getUserLocale();
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPassword(user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },
  socialProviders: {
    discord: {
      clientId: serverEnv.DISCORD_CLIENT_ID,
      clientSecret: serverEnv.DISCORD_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({
        discord: profile.username,
      }),
    },
    twitter: {
      clientId: serverEnv.TWITTER_CLIENT_ID,
      clientSecret: serverEnv.TWITTER_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({
        twitter: profile.data.username,
      }),
    },
  },
  baseURL: getBaseURL(),
  user: {
    additionalFields: {
      discord: {
        type: "string",
        required: false,
        returned: true,
        input: false,
      },
      twitter: {
        type: "string",
        required: false,
        returned: true,
        input: false,
      },
      showSocial: {
        type: "boolean",
        required: false,
        defaultValue: false,
        returned: true,
        input: true,
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        await sendDeleteAccountVerification(user.email, url);
      },
      afterDelete: async (user) => {
        await db
          .update(userAddress)
          .set({
            userId: null,
          })
          .where(eq(userAddress.userId, user.id));
      },
    },
    changeEmail: {
      enabled: true,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
    },
  },
  session: {
    freshAge: 0,
    // cookieCache: {
    //   enabled: true,
    //   maxAge: 5 * 60,
    // },
  },
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          // custom db hook to store social provider username when linking
          if (account.providerId === "credential") return;

          const authContext = await auth.$context;
          const provider = authContext.socialProviders.find((p) => p.id === account.providerId);
          const info = await provider!.getUserInfo({
            accessToken: account.accessToken ?? undefined,
          });

          await db
            .update(authSchema.user)
            .set({
              [account.providerId]:
                account.providerId === "discord"
                  ? info?.data?.username
                  : info?.data?.data?.username,
            })
            .where(eq(authSchema.user.id, account.userId));
        },
      },
    },
  },
});

export async function getSession() {
  return auth.api.getSession({
    headers: getRequestHeaders(),
  });
}

async function safeFetchByNickname(identifier: string) {
  return fetchByNickname(identifier).catch((error: FetchError<{ error: { code: string } }>) => {
    if (error.data?.error.code === "USER_NOT_FOUND") {
      return null;
    }
    return undefined;
  });
}

export async function fetchUserByIdentifier(
  identifier: string,
): Promise<PublicProfile | undefined> {
  const identifierIsAddress = isAddress(identifier);

  const cachedUser = await db.query.userAddress.findFirst({
    columns: {
      nickname: true,
      address: true,
      bannerImgUrl: true,
      bannerImgType: true,
      hideUser: true,
      privateProfile: true,
      hideNickname: true,
      gridColumns: true,
      userId: true,
      lastCosmoCheck: true,
    },
    with: {
      user: {
        columns: {
          name: true,
          username: true,
          image: true,
          discord: true,
          twitter: true,
          displayUsername: true,
          showSocial: true,
        },
      },
    },
    where: {
      [identifierIsAddress ? "address" : "nickname"]: decodeURIComponent(identifier),
    },
    orderBy: {
      id: "desc",
    },
  });

  if (cachedUser) {
    // double check address with cosmo if last check more than 1 hour
    const ONE_HOUR = 60 * 60 * 1000;
    const needsCheck =
      !cachedUser.lastCosmoCheck ||
      Date.now() - new Date(cachedUser.lastCosmoCheck).getTime() > ONE_HOUR;

    if (needsCheck && cachedUser.nickname) {
      const user = await safeFetchByNickname(cachedUser.nickname);

      if (user) {
        await cacheUsers([
          {
            address: user.address,
            nickname: user.nickname,
          },
        ]);

        return await fetchUserByIdentifier(identifier);
      }

      // nickname not found, unbind
      if (user === null) {
        await db
          .update(userAddress)
          .set({ nickname: null, cosmoId: null, lastCosmoCheck: null })
          .where(eq(userAddress.nickname, cachedUser.nickname));

        // todo: use redirect instead
        return await fetchUserByIdentifier(cachedUser.address);
      }

      // update last check
      await db
        .update(userAddress)
        .set({ lastCosmoCheck: sql`'now'` })
        .where(eq(userAddress.nickname, cachedUser.nickname));
    }

    return {
      address: cachedUser.address,
      nickname: cachedUser.hideNickname ? null : cachedUser.nickname,
      bannerImgType: cachedUser.bannerImgType,
      bannerImgUrl: cachedUser.bannerImgUrl,
      privateProfile: cachedUser.privateProfile,
      gridColumns: cachedUser.gridColumns,
      user: cachedUser.hideUser ? null : cachedUser.user ? mapPublicUser(cachedUser.user) : null,
      ownerId: cachedUser.userId,
    };
  }

  if (identifierIsAddress) {
    return {
      address: identifier,
      nickname: null,
    };
  }

  const user = await safeFetchByNickname(identifier);
  if (!user) {
    return undefined;
  }

  await cacheUsers([
    {
      address: user.address,
      nickname: user.nickname,
    },
  ]);

  return await fetchUserByIdentifier(identifier);
}

export async function cacheUsers(
  newAddresses: { nickname: string; address: string; cosmoId?: number }[],
) {
  if (newAddresses.length === 0) return;

  const values = newAddresses.map((a) => ({
    nickname: a.nickname,
    address: a.address,
    cosmoId: a.cosmoId ?? null,
    lastCosmoCheck: sql`'now'`,
  }));

  try {
    await db.transaction(async (tx) => {
      // clear nickname from any existing row that has the same nickname
      // but different address (unbind before insert)
      await tx
        .update(userAddress)
        .set({ nickname: null, cosmoId: null, lastCosmoCheck: null })
        .where(
          and(
            inArray(
              userAddress.nickname,
              values.map((v) => v.nickname),
            ),
            notInArray(
              userAddress.address,
              values.map((v) => v.address),
            ),
          ),
        );

      await tx
        .insert(userAddress)
        .values(values)
        .onConflictDoUpdate({
          target: userAddress.address,
          set: {
            nickname: sql.raw(`excluded.${userAddress.nickname.name}`),
            cosmoId: sql`coalesce(excluded.${sql.raw(userAddress.cosmoId.name)}, ${userAddress.cosmoId})`,
            lastCosmoCheck: sql`'now'`,
          },
        });
    });
  } catch (err) {
    console.error("Bulk user caching failed:", err);
  }
}

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];

export function mapPublicUser(user: PublicUser): PublicUser {
  return {
    ...user,
    discord: user.showSocial ? user.discord : null,
    twitter: user.showSocial ? user.twitter : null,
  };
}
