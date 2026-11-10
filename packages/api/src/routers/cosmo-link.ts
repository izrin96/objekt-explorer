import { ORPCError } from "@orpc/server";
import * as z from "zod";

import { refuse } from "../lib/refuse";
import { authed } from "../orpc";
import { addressSchema } from "../schemas/common/address";
import { generateCodeInputSchema, linkedPreviewsInputSchema } from "../schemas/cosmo-link";
import {
  assertAddressNotLinked,
  fetchLinkedPreviews,
  setDefault,
  unlink,
} from "../services/account/cosmo-link";
import { completeVerification, issueVerification } from "../services/account/cosmo-verify";
import { userRateLimited } from "../services/redis";

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
      return fetchLinkedPreviews(session.user.id, addresses);
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

      const issued = await issueVerification(session.user.id, {
        cosmoId: input.cosmoId,
        artistId: input.artistId,
        nickname: input.nickname,
        address: input.address,
      });
      if (!issued) throw new ORPCError("SERVICE_UNAVAILABLE");
      return issued;
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

      const linked = await completeVerification(session.user.id, address);
      if (linked === "unavailable") throw new ORPCError("SERVICE_UNAVAILABLE");
      if (linked === "expired") {
        throw errors.VERIFICATION_EXPIRED({
          message: "Verification expired, start over",
          data: { reason: "cosmo_link_verification_expired" },
        });
      }
      return linked;
    }),
};
