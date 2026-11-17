import { getRequestHeaders } from "@tanstack/react-start/server";

import { authed } from "../orpc";
import {
  certifyInputSchema,
  cosmoSessionListSchema,
  disconnectOutputSchema,
  qrCertifyOutputSchema,
  qrPollOutputSchema,
  qrStartOutputSchema,
  sessionIdInputSchema,
} from "../schemas/cosmo-session";
import { certifyQr, pollQr, startQr } from "../services/cosmo-session/qr";
import { disconnectSession, listSessions, requestSync } from "../services/cosmo-session/sessions";

/**
 * Every procedure is on `authed` and scoped to the caller's own sessions; `/rpc` only, never
 * `/api/v1`. No procedure takes a ticket, and none returns a cookie.
 */
export const cosmoSessionRouter = {
  list: authed
    .output(cosmoSessionListSchema)
    .handler(({ context: { session } }) => listSessions(session.user.id)),

  qrStart: authed
    .output(qrStartOutputSchema)
    .handler(({ context: { session, headers } }) =>
      startQr(session.user.id, headers ?? getRequestHeaders()),
    ),

  qrPoll: authed
    .output(qrPollOutputSchema)
    .handler(({ context: { session } }) => pollQr(session.user.id)),

  qrCertify: authed
    .input(certifyInputSchema)
    .output(qrCertifyOutputSchema)
    .handler(({ input, context: { session } }) => certifyQr(session.user.id, input.otp)),

  requestSync: authed
    .input(sessionIdInputSchema)
    .handler(({ input, context: { session } }) => requestSync(session.user.id, input.id)),

  disconnect: authed
    .input(sessionIdInputSchema)
    .output(disconnectOutputSchema)
    .handler(({ input, context: { session } }) => disconnectSession(session.user.id, input.id)),
};
