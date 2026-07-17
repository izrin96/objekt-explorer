import crypto from "node:crypto";

import { ORPCError } from "@orpc/server";
import { fetchUserProfile } from "@repo/cosmo/server/user";
import type { ValidArtist } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { isAddress } from "@repo/lib";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import * as z from "zod";

import { serverEnv } from "@/lib/env/server";
import { artistSchema } from "@/lib/universal/artist";
import { m } from "@/paraglide/messages";

import { redis } from "../../redis.server";
import { getAccessToken } from "../../token.server";
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
          ? m.api_errors_cosmo_link_already_linked_self()
          : m.api_errors_cosmo_link_already_linked_other(),
    });
  }
}

export const cosmoLinkRouter = {
  // check if address is already linked
  checkAddress: authed
    .input(z.string().refine((val) => isAddress(val)))
    .handler(async ({ input: address, context: { session } }) => {
      await assertAddressNotLinked(address, session.user.id);
    }),

  // remove link
  removeLink: authed
    .input(z.string().refine((val) => isAddress(val)))
    .handler(async ({ input: address, context: { session } }) => {
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
        address: z.string().refine((val) => isAddress(val)),
        cosmoId: z.number().int().positive(),
        nickname: z.string().min(1).max(24),
        artistId: artistSchema,
      }),
    )
    .handler(async ({ input, context: { session } }) => {
      // rate limit: max 5 attempts per user per 30s.
      // INCR creates the counter; EXPIRE NX (Redis 7+) sets the TTL only
      // when no TTL is set yet, so subsequent INCRs preserve the original
      // window. EXPIRE is sent unconditionally so that a process crash
      // between INCR and EXPIRE on the first call does not leave a
      // TTL-less counter.
      const rateLimitKey = `cosmo-verify-rate:${session.user.id}`;
      const attempts = await redis.incr(rateLimitKey);
      await redis.send("EXPIRE", [rateLimitKey, "30", "NX"]);
      if (attempts > 5) {
        throw new ORPCError("TOO_MANY_REQUESTS", {
          message: m.api_errors_cosmo_link_rate_limit(),
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
    .input(z.string().refine((val) => isAddress(val)))
    .handler(async ({ input: address, context: { session } }) => {
      const redisKey = `cosmo-verify:${session.user.id}:${address}`;
      const raw = await redis.get(redisKey);
      if (!raw) {
        throw new ORPCError("BAD_REQUEST", {
          message: m.api_errors_cosmo_link_verification_expired(),
        });
      }

      const data = JSON.parse(raw) as VerificationData;

      const { accessToken } = await getAccessToken();

      const profile = await fetchUserProfile(
        accessToken,
        data.cosmoId,
        data.artistId,
        serverEnv.COSMO_KEY,
      );

      // validate that the fetched profile matches claimed data
      if (profile.nickname.toLowerCase() !== data.nickname.toLowerCase()) {
        throw new ORPCError("BAD_REQUEST", {
          message: m.api_errors_cosmo_link_profile_mismatch(),
        });
      }

      if (!profile.statusMessage || !profile.statusMessage.toLowerCase().includes(data.code)) {
        throw new ORPCError("BAD_REQUEST", {
          message: m.api_errors_cosmo_link_code_not_found(),
        });
      }

      const [linked] = await db
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
          where: sql`${userAddress.userId} IS NULL`,
        })
        .returning({ linkedUserId: userAddress.userId });

      if (!linked || linked.linkedUserId !== session.user.id) {
        throw new ORPCError("BAD_REQUEST", {
          message: m.api_errors_cosmo_link_already_linked_other(),
        });
      }

      await redis.del(redisKey);

      return {
        nickname: data.nickname,
        address: data.address,
      };
    }),
};
