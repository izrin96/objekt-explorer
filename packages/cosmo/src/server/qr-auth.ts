import * as z from "zod";

import { parseSessionCookie, ticketStatusSchema } from "../session-parse";
import { CosmoSessionError, cosmoShop, guard, parseBody } from "./shop";

const ticketSchema = z.object({
  ticket: z.string().min(1),
  // a timestamp string; checked here so a stored value always parses
  expireAt: z.string().refine((v) => !Number.isNaN(Date.parse(v))),
});

/** Asks Cosmo for a sign-in ticket with a reCAPTCHA token minted on the shop page. */
export async function createLoginTicket(recaptchaToken: string) {
  const data = await guard(false, () =>
    cosmoShop("/bff/v3/users/login-by-qr/ticket", {
      method: "POST",
      body: { recaptcha: { action: "login", token: recaptchaToken } },
    }),
  );
  return parseBody(ticketSchema, data);
}

/** One status check of a ticket. Any status Cosmo adds later comes back as `unknown`. */
export async function readLoginTicket(ticket: string) {
  const data = await guard(false, () =>
    cosmoShop("/bff/v3/users/login-by-qr/ticket", { query: { ticket } }),
  );
  return parseBody(ticketStatusSchema, data);
}

/**
 * Sends the 2-digit code the Cosmo app shows. Goes through `.raw` for the `Set-Cookie`, and
 * never retries: Cosmo consumes the code on the first attempt.
 */
export async function certifyLoginTicket(ticket: string, otp: number) {
  const res = await guard(false, () =>
    cosmoShop.raw("/bff/v3/users/login-by-qr/certify", {
      method: "POST",
      body: { otp, ticket },
      responseType: "text",
      retry: false,
    }),
  );
  const session = parseSessionCookie(res.headers.getSetCookie());
  if (!session) throw new CosmoSessionError("unexpected", res.status);
  return { cookie: session.value, expiresAt: session.expiresAt };
}
