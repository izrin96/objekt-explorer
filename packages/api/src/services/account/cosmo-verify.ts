import type { ValidArtist } from "@repo/cosmo/types/common";

import { redis, redisFailOpen } from "../redis";

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
export async function storeVerification(userId: string, data: VerificationData) {
  const stored = await redisFailOpen("cosmo verify", () =>
    redis.set(keyOf(userId, data.address), JSON.stringify(data), "EX", TTL_SECONDS),
  );
  return stored !== null;
}

/** The stored code, or why there is none: an unreachable Redis is told apart from an expired code. */
export async function readVerification(
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
export async function clearVerification(userId: string, address: string) {
  await redisFailOpen("cosmo verify", () => redis.del(keyOf(userId, address)));
}
