import { fetchByNickname } from "@repo/cosmo/server/user";
import { db } from "@repo/db";
import * as authSchema from "@repo/db/auth-schema";
import { type UserAddress, userAddress } from "@repo/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins/username";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { after } from "next/server";
import { cache } from "react";
import { isAddress } from "viem";

import { env } from "@/env";

import type { PublicProfile, PublicUser } from "../universal/user";

import { getBaseURL, SITE_NAME } from "../utils";
import { sendDeleteAccountVerification, sendResetPassword, sendVerificationEmail } from "./mail";

export const auth = betterAuth({
  appName: SITE_NAME,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  plugins: [username()],
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
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({
        discord: profile.username,
      }),
    },
    twitter: {
      clientId: env.TWITTER_CLIENT_ID,
      clientSecret: env.TWITTER_CLIENT_SECRET,
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
      sendChangeEmailVerification: async ({ user, url }) => {
        await sendVerificationEmail(user.email, url);
      },
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

export const getSession = cache(async () =>
  auth.api.getSession({
    headers: await headers(),
  }),
);

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
    where: (t, { eq }) =>
      eq(identifierIsAddress ? t.address : t.nickname, decodeURIComponent(identifier)),
  });

  if (cachedUser) {
    return {
      address: cachedUser.address,
      nickname: cachedUser.hideNickname ? null : cachedUser.nickname,
      bannerImgType: cachedUser.bannerImgType,
      bannerImgUrl: cachedUser.bannerImgUrl,
      privateProfile: cachedUser.privateProfile,
      gridColumns: cachedUser.gridColumns,
      user: cachedUser.hideUser ? null : cachedUser.user ? mapPublicUser(cachedUser.user) : null,
    };
  }

  if (identifierIsAddress) {
    return {
      address: identifier,
      nickname: null,
    };
  }

  const user = await fetchByNickname(identifier).catch(() => undefined);
  if (!user) {
    return undefined;
  }

  after(async () => {
    await cacheUsers([
      {
        address: user.address,
        nickname: user.nickname,
      },
    ]);
  });

  return {
    nickname: user.nickname,
    address: user.address,
  };
}

export async function cacheUsers(newAddresses: Pick<UserAddress, "nickname" | "address">[]) {
  if (newAddresses.length > 0) {
    try {
      await db
        .insert(userAddress)
        .values(newAddresses)
        .onConflictDoUpdate({
          target: userAddress.address,
          set: {
            nickname: sql.raw(`excluded.${userAddress.nickname.name}`),
          },
        });
    } catch (err) {
      console.error("Bulk user caching failed:", err);
    }
  }
}

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];

export function toPublicUser(session: Session | null): PublicUser | undefined {
  if (!session) return undefined;

  return {
    discord: session.user.showSocial ? session.user.discord : null,
    twitter: session.user.showSocial ? session.user.twitter : null,
    displayUsername: session.user.displayUsername,
    image: session.user.image,
    name: session.user.name,
    username: session.user.username,
    showSocial: session.user.showSocial,
  };
}

export function mapPublicUser(user: PublicUser): PublicUser {
  return {
    ...user,
    discord: user.showSocial ? user.discord : null,
    twitter: user.showSocial ? user.twitter : null,
  };
}
