import crypto from "node:crypto";

import { fetchUserProfile } from "@repo/cosmo/server/user";
import type { ValidArtist } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import * as z from "zod";

import { serverEnv } from "../env";
import { refuse } from "../lib/refuse";
import { authed } from "../orpc";
import { addressSchema } from "../schemas/common/address";
import {
  generateCodeInputSchema,
  type LinkedPreview,
  linkedPreviewsInputSchema,
} from "../schemas/cosmo-link";
import { linkVerified, setDefault, unlink } from "../services/cosmo-link";
import { fetchOwnerCounts } from "../services/objekt";
import { redis } from "../services/redis";
import { getAccessToken } from "../services/token";

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
    if (existing.userId === userId) {
      refuse(
        "BAD_REQUEST",
        "cosmo_link_already_linked_self",
        "This Cosmo ID is already linked to your account",
      );
    }
    refuse(
      "BAD_REQUEST",
      "cosmo_link_already_linked_other",
      "This Cosmo ID is already linked to another account",
    );
  }
}

export const cosmoLinkRouter = {
  // check if address is already linked
  checkAddress: authed
    .input(addressSchema)
    .handler(async ({ input: address, context: { session } }) => {
      await assertAddressNotLinked(address, session.user.id);
    }),

  /** Only addresses the caller has linked, whatever else is asked for. */
  linkedPreviews: authed
    .input(linkedPreviewsInputSchema)
    .handler(async ({ input: { addresses }, context: { session } }) => {
      if (addresses.length === 0) return [];
      const linked = await db
        .select({
          address: userAddress.address,
          bannerImgUrl: userAddress.bannerImgUrl,
          bannerImgType: userAddress.bannerImgType,
        })
        .from(userAddress)
        .where(
          and(eq(userAddress.userId, session.user.id), inArray(userAddress.address, addresses)),
        );
      const counts = await fetchOwnerCounts(linked.map((row) => row.address));
      return linked.map((row): LinkedPreview => ({
        address: row.address,
        bannerImgUrl: row.bannerImgUrl,
        bannerImgType: row.bannerImgType,
        count: counts.get(row.address.toLowerCase()) ?? 0,
      }));
    }),

  // remove link
  removeLink: authed
    .input(addressSchema)
    .handler(async ({ input: address, context: { session } }) => {
      await unlink(session.user.id, address);
    }),

  /** The profile that names the account to other people. */
  setDefault: authed
    .input(z.object({ address: addressSchema }))
    .handler(async ({ input: { address }, context: { session } }) => {
      await setDefault(session.user.id, address);
    }),

  // generate verification code for a specific artist profile
  generateCode: authed
    .input(generateCodeInputSchema)
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
        refuse(
          "TOO_MANY_REQUESTS",
          "cosmo_link_rate_limit",
          "Too many attempts, try again shortly",
        );
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
    // typed, so the client can offer a new code: its countdown starts after the TTL does
    .errors({
      VERIFICATION_EXPIRED: {
        status: 400,
        data: z.object({ reason: z.literal("cosmo_link_verification_expired") }),
      },
    })
    .input(addressSchema)
    .handler(async ({ input: address, context: { session }, errors }) => {
      // each check calls Cosmo with the shared token: max 10 per user per 30s
      const rateLimitKey = `cosmo-verify-status-rate:${session.user.id}`;
      const attempts = await redis.incr(rateLimitKey);
      await redis.send("EXPIRE", [rateLimitKey, "30", "NX"]);
      if (attempts > 10) {
        refuse(
          "TOO_MANY_REQUESTS",
          "cosmo_link_rate_limit",
          "Too many attempts, try again shortly",
        );
      }

      const redisKey = `cosmo-verify:${session.user.id}:${address}`;
      const raw = await redis.get(redisKey);
      if (!raw) {
        throw errors.VERIFICATION_EXPIRED({
          message: "Verification expired, start over",
          data: { reason: "cosmo_link_verification_expired" },
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

      // the bio code proves control of the profile, not of the address the
      // client sent, so the address must be the profile's own
      if (
        profile.nickname.toLowerCase() !== data.nickname.toLowerCase() ||
        profile.address.toLowerCase() !== data.address.toLowerCase()
      ) {
        refuse("BAD_REQUEST", "cosmo_link_profile_mismatch", "Profile data mismatch, start over");
      }

      if (!profile.statusMessage || !profile.statusMessage.toLowerCase().includes(data.code)) {
        refuse(
          "BAD_REQUEST",
          "cosmo_link_code_not_found",
          "Verification code not found in the profile bio",
        );
      }

      await linkVerified(session.user.id, {
        address: data.address,
        nickname: data.nickname,
        cosmoId: data.cosmoId,
      });

      await redis.del(redisKey);

      return {
        nickname: data.nickname,
        address: data.address,
      };
    }),
};
