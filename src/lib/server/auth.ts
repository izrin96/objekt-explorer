import { fetchByNickname } from "./cosmo/auth";
import { isAddress } from "viem";
import { notFound } from "next/navigation";
import { db } from "./db";
import { userAddress } from "./db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getBaseURL } from "../utils";
import { cache } from "react";
import { headers } from "next/headers";
import { PublicProfile, PublicUser } from "../universal/user";
import { username } from "better-auth/plugins/username";
import * as authSchema from "./db/auth-schema";
import {
  sendDeleteAccountVerification,
  sendResetPassword,
  sendVerificationEmail,
} from "./mail";
import { env } from "@/env";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  appName: "Objekt Tracker",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  plugins: [username()],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: true,
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
      clientId: env.DISCORD_CLIENT_ID!,
      clientSecret: env.DISCORD_CLIENT_SECRET!,
      mapProfileToUser: (profile) => ({
        discord: profile.username,
      }),
    },
    twitter: {
      clientId: env.TWITTER_CLIENT_ID!,
      clientSecret: env.TWITTER_CLIENT_SECRET!,
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
      },
      twitter: {
        type: "string",
        required: false,
        returned: true,
      },
      showSocial: {
        type: "boolean",
        required: false,
        defaultValue: false,
        returned: true,
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
          const provider = authContext.socialProviders.find(
            (p) => p.id === account.providerId
          );
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

export const cachedSession = cache(async () =>
  auth.api.getSession({
    headers: await headers(),
  })
);

export async function fetchUserByIdentifier(
  identifier: string,
  token?: string
): Promise<PublicProfile> {
  const cachedUser = await db.query.userAddress.findFirst({
    columns: {
      nickname: true,
      address: true,
      bannerImgUrl: true,
      hideUser: true,
      privateProfile: true,
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
    where: (t, { eq, or }) =>
      or(eq(t.nickname, identifier), eq(t.address, identifier)),
  });

  if (cachedUser) {
    return {
      ...cachedUser,
      user: cachedUser.hideUser
        ? null
        : cachedUser.user
        ? mapPublicUser(cachedUser.user)
        : null,
    };
  }

  const identifierIsAddress = isAddress(identifier);

  if (identifierIsAddress) {
    return {
      address: identifier,
      nickname: identifier.substring(0, 6),
      isAddress: true,
    };
  }

  const user = await fetchByNickname(identifier, token);
  if (!user) {
    notFound();
  }

  await db
    .insert(userAddress)
    .values({
      address: user.address,
      nickname: user.nickname,
    })
    .onConflictDoUpdate({
      target: userAddress.address,
      set: {
        nickname: user.nickname,
      },
    });

  return {
    nickname: user.nickname,
    address: user.address,
  };
}

export type Session = typeof auth.$Infer.Session;

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
