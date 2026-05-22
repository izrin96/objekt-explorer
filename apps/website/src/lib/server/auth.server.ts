import { i18n } from "@better-auth/i18n";
import { fetchByNickname } from "@repo/cosmo/server/user";
import { db } from "@repo/db";
import * as authSchema from "@repo/db/auth-schema";
import { type UserAddress, userAddress } from "@repo/db/schema";
import { isAddress } from "@repo/lib";
import { fetchUserProfiles } from "@repo/lib/server/user";
import { redirect } from "@tanstack/react-router";
import { getRequestHeaders, setResponseHeader } from "@tanstack/react-start/server";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { username } from "better-auth/plugins/username";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { FetchError } from "ofetch";

import { betterAuthLocale } from "@/i18n/better-auth";
import { serverEnv } from "@/lib/env/server";
import { getLocale as getParaglideLocale } from "@/paraglide/runtime";

import type { PublicUser, PublicProfile, CurrentUser } from "../universal/user";
import { SITE_NAME } from "../utils";
import { fetchOwnedLists } from "./list.server";
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
      localeCookie: "PARAGLIDE_LOCALE",
      getLocale: () => {
        return getParaglideLocale();
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
        email: profile.email ?? `${profile.id}@discord.placeholder.local`,
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

export type User = (typeof auth.$Infer.Session)["user"];

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

export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) return null;

  const lists = await fetchOwnedLists("userId", session.user.id);
  const profiles = await fetchUserProfiles(session.user.id);

  return {
    user: session.user,
    lists,
    profiles,
  };
}

async function safeFetchByNickname(identifier: string) {
  return fetchByNickname(identifier).catch((error: FetchError<{ error: { code: string } }>) => {
    if (error.data?.error.code === "USER_NOT_FOUND") {
      return null;
    }
    return undefined;
  });
}

async function touchLastCheck(nickname: string) {
  await db
    .update(userAddress)
    .set({ lastCosmoCheck: sql`'now'` })
    .where(eq(userAddress.nickname, nickname));
}

export function toPublicUser(user: User): PublicUser {
  return {
    name: user.name,
    image: user.image ?? null,
    discord: user.showSocial && user.discord ? user.discord : null,
    twitter: user.showSocial && user.twitter ? user.twitter : null,
  };
}

export function toPublicProfile(
  profile: UserAddress,
  user: User | null,
  currentUser?: User,
): PublicProfile {
  if (profile.privateProfile && (!currentUser || currentUser.id !== profile.userId)) {
    return {
      isGuard: true,
      address: profile.address,
      nickname: null,
    };
  }

  return {
    address: profile.address,
    nickname: profile.hideNickname ? null : profile.nickname,
    bannerImgType: profile.bannerImgType,
    bannerImgUrl: profile.bannerImgUrl,
    gridColumns: profile.gridColumns,
    user: profile.hideUser || !user ? null : toPublicUser(user),
  };
}

export async function fetchUserByIdentifier(
  identifier: string,
  currentUser?: User,
): Promise<PublicProfile | undefined> {
  if (!identifier) return undefined;

  const identifierIsAddress = isAddress(identifier);

  const cachedUser = await db.query.userAddress.findFirst({
    with: {
      user: true,
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
        await touchLastCheck(cachedUser.nickname);

        if (
          user.address.toLowerCase() !== cachedUser.address.toLowerCase() ||
          user.nickname.toLowerCase() !== cachedUser.nickname.toLowerCase()
        ) {
          await cacheUsers([
            {
              address: user.address,
              nickname: user.nickname,
            },
          ]);

          return await fetchUserByIdentifier(identifier, currentUser);
        }

        return toPublicProfile(cachedUser, cachedUser.user, currentUser);
      }

      // nickname not found, unbind
      if (user === null) {
        await db
          .update(userAddress)
          .set({ nickname: null, cosmoId: null, lastCosmoCheck: null })
          .where(eq(userAddress.nickname, cachedUser.nickname));

        throw redirect({
          to: "/@{$nickname}",
          params: { nickname: cachedUser.address.toLowerCase() },
        });
      }

      // update last check
      await touchLastCheck(cachedUser.nickname);
    }

    return toPublicProfile(cachedUser, cachedUser.user, currentUser);
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

  return await fetchUserByIdentifier(identifier, currentUser);
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
