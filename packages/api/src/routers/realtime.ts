import { ORPCError } from "@orpc/server";
import { signHs256 } from "@repo/lib/server/jwt";

import { serverEnv } from "../env";
import { connectionClaims } from "../lib/realtime-token";
import { authed } from "../orpc";

export const realtimeRouter = {
  /** Centrifugo's connection token for the signed-in user; a session is what it costs. */
  token: authed.handler(async ({ context: { session } }) => {
    const secret = serverEnv.CENTRIFUGO_TOKEN_SECRET;
    if (!secret) throw new ORPCError("SERVICE_UNAVAILABLE");
    return { token: await signHs256(connectionClaims(session.user.id, Date.now()), secret) };
  }),
};
