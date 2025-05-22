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

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  plugins: [username()],
  socialProviders: {
    discord: {
      overrideUserInfoOnSignIn: true,
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      mapProfileToUser: (profile) => ({
        discord: profile.username,
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
        fieldName: "discord",
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
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
          displayUsername: true,
        },
      },
    },
    where: (t, { eq, or }) =>
      or(eq(t.nickname, identifier), eq(t.address, identifier)),
  });

  if (cachedUser) {
    return {
      ...cachedUser,
      user: cachedUser.hideUser ? null : cachedUser.user,
    };
  }

  const identifierIsAddress = isAddress(identifier);

  if (identifierIsAddress) {
    return {
      address: identifier,
      nickname: identifier.substring(0, 6),
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
    discord: session.user.discord,
    displayUsername: session.user.displayUsername,
    image: session.user.image,
    name: session.user.name,
    username: session.user.username,
  };
}
