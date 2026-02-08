import type { ValidArtist } from "@repo/cosmo/types/common";

import { ORPCError } from "@orpc/server";
import { fetchUserProfile } from "@repo/cosmo/server/user";
import { validArtists } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import crypto from "node:crypto";
import * as z from "zod";

import { redis } from "../../redis";
import { getAccessToken } from "../../token";
import { authed } from "../orpc";

type VerificationData = {
  code: string;
  cosmoId: number;
  artistId: ValidArtist;
  nickname: string;
  address: string;
};

function generateCode() {
  const hex = crypto.randomBytes(3).toString("hex");
  return `verify-${hex}`;
}

async function assertAddressNotLinked(address: string, userId: string) {
  const [existing] = await db
    .select({ userId: userAddress.userId })
    .from(userAddress)
    .where(and(eq(userAddress.address, address), isNotNull(userAddress.userId)))
    .limit(1);

  if (existing) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        existing.userId === userId
          ? "This Cosmo ID is already linked to your account."
          : "This Cosmo ID is already linked to another account.",
    });
  }
}

export const cosmoLinkRouter = {
  // check if address is already linked
  checkAddress: authed
    .input(z.string())
    .handler(async ({ input: address, context: { session } }) => {
      await assertAddressNotLinked(address, session.user.id);
    }),

  // remove link
  removeLink: authed.input(z.string()).handler(async ({ input: address, context: { session } }) => {
    await db
      .update(userAddress)
      .set({
        userId: null,
      })
      .where(and(eq(userAddress.userId, session.user.id), eq(userAddress.address, address)));
  }),

  // generate verification code for a specific artist profile
  generateCode: authed
    .input(
      z.object({
        address: z.string(),
        cosmoId: z.number().int().positive(),
        nickname: z.string().min(1).max(24),
        artistId: z.enum(validArtists),
      }),
    )
    .handler(async ({ input, context: { session } }) => {
      // rate limit: 1 active code per user per address (Redis key is scoped)
      const rateLimitKey = `cosmo-verify-rate:${session.user.id}`;
      const attempts = await redis.incr(rateLimitKey);
      if (attempts === 1) {
        await redis.expire(rateLimitKey, 30);
      }
      if (attempts > 5) {
        throw new ORPCError("TOO_MANY_REQUESTS", {
          message: "Too many attempts. Please wait before trying again.",
        });
      }

      // re-check link status server-side
      await assertAddressNotLinked(input.address, session.user.id);

      const code = generateCode();

      const redisKey = `cosmo-verify:${session.user.id}:${input.address}`;
      const redisValue: VerificationData = {
        code,
        cosmoId: input.cosmoId,
        artistId: input.artistId,
        nickname: input.nickname,
        address: input.address,
      };
      await redis.set(redisKey, JSON.stringify(redisValue), "EX", 120);

      return {
        code,
        expiresInMs: 120_000,
      };
    }),

  // verify bio contains the code and link the account
  verifyStatusMessage: authed
    .input(z.string())
    .handler(async ({ input: address, context: { session } }) => {
      const redisKey = `cosmo-verify:${session.user.id}:${address}`;
      const raw = await redis.get(redisKey);
      if (!raw) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Verification expired. Please start over.",
        });
      }

      const data = JSON.parse(raw) as VerificationData;

      // re-check link status
      await assertAddressNotLinked(data.address, session.user.id);

      const { accessToken } = await getAccessToken();

      const profile = await fetchUserProfile(accessToken, data.cosmoId, data.artistId);

      // validate that the fetched profile matches claimed data
      if (profile.nickname.toLowerCase() !== data.nickname.toLowerCase()) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Profile data mismatch. Please start over.",
        });
      }

      if (!profile.statusMessage?.toLowerCase().includes(data.code)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Verification code not found in bio. Please check and try again.",
        });
      }

      await db
        .insert(userAddress)
        .values([
          {
            address: data.address,
            nickname: data.nickname,
            cosmoId: data.cosmoId,
            linkedAt: sql`'now'`,
            userId: session.user.id,
            hideUser: true,
          },
        ])
        .onConflictDoUpdate({
          target: userAddress.address,
          set: {
            nickname: data.nickname,
            cosmoId: data.cosmoId,
            linkedAt: sql`'now'`,
            userId: session.user.id,
            hideUser: true,
          },
        });

      await redis.del(redisKey);

      return {
        nickname: data.nickname,
        address: data.address,
      };
    }),
};
