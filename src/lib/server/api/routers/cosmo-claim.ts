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

export const cosmoClaimRouter = createTRPCRouter({
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
        await certifyTicket(otp, ticket);

        var result = await checkTicket(ticket);

        if (result.status === "certified") {
          // link cosmo id with user
        }
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error submit otp",
        });
      }
      return true;
    }),
});
