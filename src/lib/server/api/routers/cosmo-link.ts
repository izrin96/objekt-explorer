import { TRPCError } from "@trpc/server";
import {
  certifyTicket,
  checkTicket,
  generateQrTicket,
  generateRecaptchaToken,
} from "../../cosmo/shop/qr-auth";
import { authProcedure, createTRPCRouter } from "../trpc";
import { z } from "zod";
import { TicketCheck } from "@/lib/universal/cosmo/shop/qr-auth";
import { db } from "../../db";
import { userAddress } from "../../db/schema";
import { and, eq, sql } from "drizzle-orm";
import { fetchByNickname } from "../../cosmo/auth";

export const cosmoLinkRouter = createTRPCRouter({
  // get all linked
  myList: authProcedure.query(async ({ ctx: { session } }) => {
    const result = await db.query.userAddress.findMany({
      columns: {
        address: true,
        nickname: true,
        linkedAt: true,
      },
      where: (t, { eq }) => eq(t.userId, session.user.id),
    });
    return result;
  }),

  // remove link
  removeLink: authProcedure
    .input(z.string())
    .mutation(async ({ input: address, ctx: { session } }) => {
      await db
        .update(userAddress)
        .set({
          userId: null,
        })
        .where(
          and(
            eq(userAddress.userId, session.user.id),
            eq(userAddress.address, address)
          )
        );
    }),

  // generate qr ticket
  getTicket: authProcedure.query(async () => {
    try {
      var token = await generateRecaptchaToken();
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error getting recaptcha token",
      });
    }

    try {
      var result = await generateQrTicket(token);
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error getting ticket",
      });
    }

    return result;
  }),

  // check the ticket with cosmo shop
  checkTicket: authProcedure
    .input(z.string())
    .query(async ({ input: ticket }) => {
      try {
        var result = await checkTicket(ticket);
      } catch {
        return {
          status: "expired",
        } satisfies TicketCheck;
      }
      return result;
    }),

  // send otp and check the ticket
  // and then link cosmo id with user
  otpAndLink: authProcedure
    .input(
      z.object({
        otp: z.number(),
        ticket: z.string(),
      })
    )
    .mutation(async ({ input: { otp, ticket }, ctx: { session } }) => {
      try {
        // send otp
        const s = await certifyTicket(otp, ticket);
        console.log(s);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Wrong OTP code",
        });
      }

      try {
        // check for status certified
        var result = await checkTicket(ticket);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error getting ticket",
        });
      }

      if (result.status === "certified") {
        // get user wallet address by nickname
        const address = await fetchByNickname(result.user.nickname);
        if (address === undefined)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error fetching address",
          });

        // link cosmo id with user
        await db
          .update(userAddress)
          .set({
            linkedAt: sql`'now'`,
            userId: session.user.id,
          })
          .where(eq(userAddress.address, address.address));
      }

      return true;
    }),
});
