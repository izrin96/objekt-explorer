import { i18n } from "@better-auth/i18n";
import { fetchByNickname } from "@repo/cosmo/server/user";
import { db } from "@repo/db";
import * as authSchema from "@repo/db/auth-schema";
import { userAddress } from "@repo/db/schema";
import { isAddress } from "@repo/lib";
import { redirect } from "@tanstack/react-router";
import { getRequestHeaders, setResponseHeader } from "@tanstack/react-start/server";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { username } from "better-auth/plugins/username";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { FetchError } from "ofetch";
import * as z from "zod";

import { betterAuthLocale } from "@/i18n/better-auth";
import { serverEnv } from "@/lib/env/server";

import { publicUserSchema, type PublicProfile, type PublicUser } from "../universal/user";
import { SITE_NAME } from "../utils";
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
  baseURL: serverEnv.VITE_SITE_URL,
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-client-ip", "x-forwarded-for", "cf-connecting-ip"],
    },
  },
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
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
    returnHeaders: true,
  });

  if (!session.response) {
    return null;
  }

  const cookies = session.headers.getSetCookie();
  if (cookies.length) {
    setResponseHeader("Set-Cookie", cookies);
  }

  return session.response;
}

async function safeFetchByNickname(identifier: string) {
  return fetchByNickname(identifier).catch((error: FetchError<{ error: { code: string } }>) => {
    if (error.data?.error.code === "USER_NOT_FOUND") {
      return null;
    }
    return undefined;
  });
}

const cachedUserSchema = z.object({
  address: z.string(),
  nickname: z.string().nullable(),
  bannerImgUrl: z.string().nullable(),
  bannerImgType: z.string().nullable(),
  privateProfile: z.boolean().nullable(),
  gridColumns: z.number().nullable(),
  userId: z.string().nullable(),
  hideNickname: z.boolean().nullable(),
  hideUser: z.boolean().nullable(),
  user: publicUserSchema.nullable(),
});

function toPublicProfile(data: z.infer<typeof cachedUserSchema>): PublicProfile {
  return {
    address: data.address,
    nickname: data.hideNickname ? null : data.nickname,
    bannerImgType: data.bannerImgType,
    bannerImgUrl: data.bannerImgUrl,
    privateProfile: data.privateProfile,
    gridColumns: data.gridColumns,
    user: data.hideUser ? null : data.user ? mapPublicUser(data.user) : null,
    ownerId: data.userId,
  };
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
        if (user.address !== cachedUser.address || user.nickname !== cachedUser.nickname) {
          await cacheUsers([
            {
              address: user.address,
              nickname: user.nickname,
            },
          ]);

          return await fetchUserByIdentifier(identifier);
        }

        await db
          .update(userAddress)
          .set({ lastCosmoCheck: sql`'now'` })
          .where(eq(userAddress.nickname, cachedUser.nickname));

        return toPublicProfile(cachedUser);
      }

      // nickname not found, unbind
      if (user === null) {
        await db
          .update(userAddress)
          .set({ nickname: null, cosmoId: null, lastCosmoCheck: null })
          .where(eq(userAddress.nickname, cachedUser.nickname));

        throw redirect({
          to: "/@{$nickname}",
          params: { nickname: cachedUser.address },
        });
      }

      // update last check
      await db
        .update(userAddress)
        .set({ lastCosmoCheck: sql`'now'` })
        .where(eq(userAddress.nickname, cachedUser.nickname));
    }

    return toPublicProfile(cachedUser);
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
