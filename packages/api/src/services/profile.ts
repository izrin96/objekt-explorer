import { ORPCError } from "@orpc/server";
import { fetchByNickname } from "@repo/cosmo/server/user";
import { db } from "@repo/db";
import { type UserAddress, userAddress } from "@repo/db/schema";
import { isAddress } from "@repo/lib";
import { cacheUsers } from "@repo/lib/server/user";
import { and, eq, sql } from "drizzle-orm";
import type { FetchError } from "ofetch";

import type { ApiMessages } from "../orpc";
import type { PublicProfile, PublicUser } from "../schemas/user";
import type { User } from "./auth";
import { isProfileHidden } from "./privacy";

/** the signed-in user has linked this Cosmo address */
export async function assertProfileOwned(address: string, userId: string, messages: ApiMessages) {
  const count = await db.$count(
    userAddress,
    and(eq(userAddress.address, address), eq(userAddress.userId, userId)),
  );

  if (count < 1) {
    throw new ORPCError("FORBIDDEN", {
      message: messages.profile_not_linked(),
    });
  }
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
  if (isProfileHidden(profile, currentUser?.id)) {
    return {
      isGuard: true,
      address: profile.address,
      nickname: profile.hideNickname ? null : profile.nickname,
    };
  }

  return {
    verified: user !== null,
    address: profile.address,
    nickname: profile.hideNickname ? null : profile.nickname,
    bannerImgType: profile.bannerImgType,
    bannerImgUrl: profile.bannerImgUrl,
    gridColumns: profile.gridColumns,
    user: profile.hideUser || !user ? null : toPublicUser(user),
  };
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** `retried` marks the lookup made after caching a user, so a failed cache write cannot loop */
export async function fetchUserByIdentifier(
  rawIdentifier: string,
  currentUser?: User,
  retried = false,
): Promise<PublicProfile | undefined> {
  if (!rawIdentifier) return undefined;

  const identifier = safeDecode(rawIdentifier);
  const identifierIsAddress = isAddress(identifier);

  const cachedUser = await db.query.userAddress.findFirst({
    with: {
      user: true,
    },
    where: {
      [identifierIsAddress ? "address" : "nickname"]: identifier,
    },
    orderBy: {
      id: "desc",
    },
  });

  if (cachedUser) {
    // double check address with cosmo if last check more than 1 hour
    const needsCheck =
      !cachedUser.lastCosmoCheck ||
      Date.now() - new Date(cachedUser.lastCosmoCheck).getTime() > 60 * 60 * 1000;

    if (needsCheck && cachedUser.nickname) {
      const user = await safeFetchByNickname(cachedUser.nickname);

      if (user) {
        // address changes
        if (user.address.toLowerCase() !== cachedUser.address.toLowerCase()) {
          await touchLastCheck(cachedUser.nickname);

          await cacheUsers([
            {
              address: user.address,
              nickname: user.nickname,
            },
          ]);

          return fetchUserByIdentifier(identifier, currentUser, true);
        }

        // no changes, update last check
        await touchLastCheck(cachedUser.nickname);

        return toPublicProfile(cachedUser, cachedUser.user, currentUser);
      }

      // nickname not found, unbind
      if (user === null) {
        await db
          .update(userAddress)
          .set({ nickname: null, cosmoId: null, lastCosmoCheck: null })
          .where(eq(userAddress.nickname, cachedUser.nickname));

        return undefined;
      }

      // api down, check again in next hour
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

  // the user was just cached and still is not found, so Cosmo is not asked again
  if (retried) return undefined;

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

  return (
    (await fetchUserByIdentifier(identifier, currentUser, true)) ?? {
      address: user.address,
      nickname: user.nickname,
    }
  );
}
