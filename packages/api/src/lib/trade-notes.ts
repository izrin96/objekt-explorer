import type { TradePayload } from "../schemas/offer";
import type { SettledTrade } from "./trade-match";

/**
 * A wrong copy's note: `wrong_copy` and `wrong_copy_auto_accepted` go to both parties,
 * `wrong_copy_declined` to the giver, `wrong_copy_due` to the receiver.
 */
export function wrongCopyNote(
  settled: SettledTrade,
  event: "wrong_copy" | "wrong_copy_declined" | "wrong_copy_due" | "wrong_copy_auto_accepted",
  to: { userId: string; partner: { userId: string; name: string } },
  progress: { verified: number; total: number },
  copy: NonNullable<TradePayload["copy"]>,
  acceptBy?: string | null,
) {
  return {
    type: "trade" as const,
    userId: to.userId,
    payload: {
      tradeId: settled.tradeId,
      offerId: settled.offerId,
      conversationId: settled.conversationId,
      event,
      reason: null,
      progress,
      partner: to.partner,
      copy,
      ...(acceptBy ? { acceptBy: new Date(acceptBy).toISOString() } : {}),
    },
  };
}
