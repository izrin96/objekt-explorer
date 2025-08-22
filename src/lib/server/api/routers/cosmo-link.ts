/** biome-ignore-all lint/correctness/noInnerDeclarations: false */

import { ORPCError } from "@orpc/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import type { TicketCheck } from "@/lib/universal/cosmo/shop/qr-auth";
import {
  certifyTicket,
  checkTicket as checkQrTicket,
  generateQrTicket,
  generateRecaptchaToken,
  getUser,
} from "../../cosmo/shop/qr-auth";
import { db } from "../../db";
import { userAddress } from "../../db/schema";
import { authed } from "../orpc";

export const cosmoLinkRouter = {
  // remove link
  removeLink: authed.input(z.string()).handler(async ({ input: address, context: { session } }) => {
    await db
      .update(userAddress)
      .set({
        userId: null,
      })
      .where(and(eq(userAddress.userId, session.user.id), eq(userAddress.address, address)));
  }),

  // generate qr ticket
  getTicket: authed.handler(async () => {
    const token = await generateRecaptchaToken();

    if (token === null) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Error getting recaptcha token",
      });
    }

    try {
      const result = await generateQrTicket(token);
      return result;
    } catch {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Error getting ticket",
      });
    }
  }),

  // check the ticket with cosmo shop
  checkTicket: authed.input(z.string()).handler(async ({ input: ticket }) => {
    try {
      const result = await checkQrTicket(ticket);
      return result;
    } catch {
      return {
        status: "expired",
      } satisfies TicketCheck;
    }
  }),

  // send otp and check the ticket
  // and then link cosmo id with user
  otpAndLink: authed
    .input(
      z.object({
        otp: z.number(),
        ticket: z.string(),
      }),
    )
    .handler(async ({ input: { otp, ticket }, context: { session } }) => {
      try {
        // send otp
        var response = await certifyTicket(otp, ticket);
      } catch {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Wrong OTP code",
        });
      }

      // extract session from cookie
      const headers = response.headers.getSetCookie();
      let userSession: string | null = null;
      for (const header of headers) {
        const parts = header.split(";");
        for (const part of parts) {
          const [name, value] = part.trim().split("=");
          if (name === "user-session") {
            userSession = value;
            break;
          }
        }
      }

      if (!userSession)
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Error getting user session",
        });

      const user = await getUser(userSession);
      if (!user)
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Error fetching address",
        });

      // link cosmo id with user
      await db
        .update(userAddress)
        .set({
          linkedAt: sql`'now'`,
          userId: session.user.id,
          hideUser: true,
        })
        .where(eq(userAddress.address, user.address));

      return true;
    }),
};
