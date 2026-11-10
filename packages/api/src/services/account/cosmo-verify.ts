import crypto from "node:crypto";

import { fetchUserProfile } from "@repo/cosmo/server/user";
import type { ValidArtist } from "@repo/cosmo/types/common";

import { serverEnv } from "../../env";
import { verifyRefusal } from "../../lib/link-rules";
import { refuse } from "../../lib/refuse";
import { redis, redisFailOpen } from "../redis";
import { getAccessToken } from "../token";
import { linkVerified } from "./cosmo-link";

/** What a code was issued for, kept two minutes for the bio check. */
export type VerificationData = {
  code: string;
  cosmoId: number;
  artistId: ValidArtist;
  nickname: string;
  address: string;
};

const TTL_SECONDS = 120;
const keyOf = (userId: string, address: string) => `cosmo-verify:${userId}:${address}`;

/** False when Redis is unreachable. */
async function storeVerification(userId: string, data: VerificationData) {
  const stored = await redisFailOpen("cosmo verify", () =>
    redis.set(keyOf(userId, data.address), JSON.stringify(data), "EX", TTL_SECONDS),
  );
  return stored !== null;
}

/** The stored code, or why there is none: an unreachable Redis is told apart from an expired code. */
async function readVerification(
  userId: string,
  address: string,
): Promise<VerificationData | "expired" | "unavailable"> {
  const read = await redisFailOpen("cosmo verify", async () => ({
    raw: await redis.get(keyOf(userId, address)),
  }));
  if (read === null) return "unavailable";
  return read.raw ? (JSON.parse(read.raw) as VerificationData) : "expired";
}

/** The code expires on its own within two minutes, so a failed delete changes nothing. */
async function clearVerification(userId: string, address: string) {
  await redisFailOpen("cosmo verify", () => redis.del(keyOf(userId, address)));
}

/**
 * A code for the profile the caller claims, with how long it stays valid, which the client counts
 * down from; null when Redis is unreachable, since a code never stored could only fail at verify.
 */
export async function issueVerification(userId: string, claim: Omit<VerificationData, "code">) {
  const code = `verify-${crypto.randomBytes(3).toString("hex")}`;
  if (!(await storeVerification(userId, { code, ...claim }))) return null;
  return { code, expiresInMs: TTL_SECONDS * 1000 };
}

const VERIFY_MESSAGES = {
  cosmo_link_profile_mismatch: "Profile data mismatch, start over",
  cosmo_link_code_not_found: "Verification code not found in the profile bio",
} as const;

/**
 * Links the address once the claimed profile's bio carries its code, and clears the code. Returns
 * `expired` or `unavailable` (Redis unreachable) for the caller to answer; a profile that does
 * not prove the claim refuses.
 */
export async function completeVerification(userId: string, address: string) {
  const claim = await readVerification(userId, address);
  if (claim === "expired" || claim === "unavailable") return claim;

  const { accessToken } = await getAccessToken();
  const profile = await fetchUserProfile(
    accessToken,
    claim.cosmoId,
    claim.artistId,
    serverEnv.COSMO_KEY,
  );
  const refusal = verifyRefusal(profile, claim);
  if (refusal) refuse("BAD_REQUEST", refusal, VERIFY_MESSAGES[refusal]);

  await linkVerified(userId, {
    address: claim.address,
    nickname: claim.nickname,
    cosmoId: claim.cosmoId,
  });
  await clearVerification(userId, address);
  return { nickname: claim.nickname, address: claim.address };
}
