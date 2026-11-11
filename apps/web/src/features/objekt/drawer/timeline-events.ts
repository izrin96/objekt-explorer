import type { SerialTransfer } from "@repo/api/schemas/collections";
import { Addresses } from "@repo/lib";

export type EventKind = "mint" | "transfer" | "spin";

/**
 * The events are categories, not states, so they own three hues of their own
 * rather than borrowing the feedback tokens — which are chip fills that vanish
 * on a light page. `app.css` holds the pair per theme.
 */
export const EVENT_COLOR: Record<EventKind, string> = {
  mint: "bg-event-mint",
  transfer: "bg-event-transfer",
  spin: "bg-event-spin",
};

export type TimelineEvent = {
  id: string;
  kind: EventKind;
  /** a nickname, or a raw `0x…` address when Cosmo has no name for the holder */
  owner: string;
  address: string;
  /** render the owner in mono — it is a raw address, not a nickname */
  mono: boolean;
  at: Date;
};

/** the response is newest first, so the last row is the mint */
export function toTimeline(rows: SerialTransfer[]): TimelineEvent[] {
  return rows.map((row, index) => {
    const spun = row.to.toLowerCase() === Addresses.SPIN;
    const kind: EventKind = spun ? "spin" : index === rows.length - 1 ? "mint" : "transfer";
    return {
      id: row.id,
      kind,
      owner: spun ? "COSMO" : (row.nickname ?? row.to),
      address: row.to,
      mono: !spun && !row.nickname,
      at: new Date(row.timestamp),
    };
  });
}
