import { expiryGroupKey } from "@repo/api/schemas/cosmo-session";
import { cosmoSessionExpiryPayloadSchema } from "@repo/api/schemas/notification";
import type { notification } from "@repo/db/schema";

export type ClaimedSession = { id: number; userId: string; expiresAtMs: number };

/** The notices for sessions just claimed, and the users whose bell must refresh (each once). */
export function expiryNotices(claimed: ClaimedSession[]) {
  const rows: (typeof notification.$inferInsert)[] = claimed.map(({ id, userId, expiresAtMs }) => {
    const expiresAt = new Date(expiresAtMs).toISOString();
    return {
      userId,
      type: "cosmo_session_expiry",
      payload: cosmoSessionExpiryPayloadSchema.parse({ expiresAt }),
      groupKey: expiryGroupKey(id, expiresAt),
    };
  });
  return { rows, userIds: [...new Set(claimed.map((c) => c.userId))] };
}
