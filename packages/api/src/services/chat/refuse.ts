import { ORPCError } from "@orpc/server";

import type { ChatRefusal } from "../../schemas/chat";

export function refuse(reason: ChatRefusal, retryAt?: Date): never {
  const data = retryAt ? { reason, retryAt: retryAt.toISOString() } : { reason };
  switch (reason) {
    case "message_limit":
    case "settings_limit":
      throw new ORPCError("TOO_MANY_REQUESTS", { data });
    case "self":
    case "invalid_card":
    case "unsend_closed":
    case "invalid_reply":
      throw new ORPCError("BAD_REQUEST", { data });
    case "no_address":
    case "not_accepting":
    case "muted":
      throw new ORPCError("FORBIDDEN", { data });
  }
}
