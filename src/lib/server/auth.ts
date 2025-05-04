import { fetchByNickname } from "./cosmo/auth";
import { isAddress } from "viem";
import { notFound } from "next/navigation";
import { db } from "./db";
import { userAddress } from "./db/schema";
import { CosmoPublicUser } from "../universal/cosmo/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getBaseURL } from "../utils";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      mapProfileToUser: (profile) => ({
        name: profile.username,
      }),
    },
  },
  baseURL: getBaseURL(),
});

export async function fetchUserByIdentifier(
  identifier: string,
  token: string
): Promise<CosmoPublicUser> {
  const identifierIsAddress = isAddress(identifier);

  if (identifierIsAddress) {
    return {
      address: identifier,
      nickname: identifier.substring(0, 6),
      profileImageUrl: "",
      profile: [],
    };
  }

  const cachedUser = await db.query.userAddress.findFirst({
    where: (t, { eq }) => eq(t.nickname, identifier),
  });

  if (cachedUser) {
    return {
      nickname: cachedUser.nickname,
      address: cachedUser.address,
      profileImageUrl: "",
      profile: [],
    };
  }

  const user = await fetchByNickname(token, identifier);
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

  return user;
}
