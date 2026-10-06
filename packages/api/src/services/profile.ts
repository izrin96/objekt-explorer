import { ORPCError } from "@orpc/server";
import { fetchByNickname } from "@repo/cosmo/server/user";
import { db } from "@repo/db";
import { type UserAddress, userAddress } from "@repo/db/schema";
import { Addresses, isAddress } from "@repo/lib";
import { cacheUsers } from "@repo/lib/server/user";
import { and, eq, sql } from "drizzle-orm";
import type { FetchError } from "ofetch";

import { isMessageable, toMessagePref } from "../lib/chat-rules";
import type { ApiMessages } from "../orpc";
import type { ProfilePreview, PublicProfile, PublicUser } from "../schemas/profile";
import type { User } from "./auth";
import { isBlockedEither } from "./moderation";
import { fetchOwnerSummary } from "./objekt";
import { isProfileHidden } from "./privacy";
import { getCache } from "./redis";

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

type ProfileUser = User & { messagePref: { allow: string; allowHidden: boolean } | null };

/** The profile page's read: the public profile plus whether it offers Message to the viewer. */
async function toProfilePage(profile: UserAddress, user: ProfileUser | null, currentUser?: User) {
  const shown = toPublicProfile(profile, user, currentUser);
  // the account id only where the profile already shows its owner, so Hide User stays untied
  const publicProfile = shown.user && user ? { ...shown, userId: user.id } : shown;
  if (publicProfile.isGuard || !user || user.id === currentUser?.id) {
    return { ...publicProfile, messageable: false };
  }
  // a blocked pair sees no button at all, as with Nobody, rather than a refusal
  const blocked = currentUser ? await isBlockedEither(currentUser.id, user.id) : false;
  return {
    ...publicProfile,
    messageable: !blocked && isMessageable(toMessagePref(user.messagePref), profile.hideUser),
  };
}

/** The hover card: database only, so a hover never asks Cosmo or writes a row. */
export async function fetchProfilePreview(
  input: string,
  viewer: User | undefined,
): Promise<ProfilePreview> {
  const address = input.toLowerCase();
  const row = await db.query.userAddress.findFirst({
    with: { user: true },
    where: { address },
    orderBy: { id: "desc" },
  });
  const profile = row ? toPublicProfile(row, row.user, viewer) : { address, nickname: null };

  // Spin holds too many tokens to count on a hover
  if (profile.isGuard || address === Addresses.SPIN) return { ...profile, counts: null };

  const counts = await getCache(`profile-preview:${address}`, 300, () =>
    fetchOwnerSummary(address),
  );
  return { ...profile, counts };
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
      user: { with: { messagePref: true } },
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

        return toProfilePage(cachedUser, cachedUser.user, currentUser);
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

    return toProfilePage(cachedUser, cachedUser.user, currentUser);
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
