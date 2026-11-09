import crypto from "node:crypto";

import { ORPCError } from "@orpc/server";
import { fetchUserProfile } from "@repo/cosmo/server/user";
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
import { linkVerified, setDefault, unlink } from "../services/account/cosmo-link";
import {
  clearVerification,
  readVerification,
  storeVerification,
} from "../services/account/cosmo-verify";
import { fetchOwnerCounts } from "../services/objekt/catalog";
import { userRateLimited } from "../services/redis";
import { getAccessToken } from "../services/token";

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
      if (await userRateLimited("cosmo-verify", session.user.id, 5, 30)) {
        refuse(
          "TOO_MANY_REQUESTS",
          "cosmo_link_rate_limit",
          "Too many attempts, try again shortly",
        );
      }

      // re-check link status server-side
      await assertAddressNotLinked(input.address, session.user.id);

      const code = generateCode();

      // a code that was never stored could only fail at verify, so no code is handed out
      const stored = await storeVerification(session.user.id, {
        code,
        cosmoId: input.cosmoId,
        artistId: input.artistId,
        nickname: input.nickname,
        address: input.address,
      });
      if (!stored) throw new ORPCError("SERVICE_UNAVAILABLE");

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
      if (await userRateLimited("cosmo-verify-status", session.user.id, 10, 30)) {
        refuse(
          "TOO_MANY_REQUESTS",
          "cosmo_link_rate_limit",
          "Too many attempts, try again shortly",
        );
      }

      const read = await readVerification(session.user.id, address);
      if (read === "unavailable") throw new ORPCError("SERVICE_UNAVAILABLE");
      if (read === "expired") {
        throw errors.VERIFICATION_EXPIRED({
          message: "Verification expired, start over",
          data: { reason: "cosmo_link_verification_expired" },
        });
      }

      const data = read;

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

      await clearVerification(session.user.id, address);

      return {
        nickname: data.nickname,
        address: data.address,
      };
    }),
};
