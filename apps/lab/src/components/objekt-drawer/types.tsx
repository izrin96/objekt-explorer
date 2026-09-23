import type { Icon } from "@phosphor-icons/react";
import { ArrowRightIcon, ArrowsClockwiseIcon, CheckIcon, SparkleIcon } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { SPIN_OWNER, transfersFor } from "@/fixtures/serials";
import { truncateAddress } from "@/lib/address";
import type { EventKind } from "@/lib/objekt";

/**
 * The objekt drawer's data model: the three `/api/objekts/*` response shapes,
 * the timeline row the Serials panel renders, and the badge each kind of row
 * wears. The panels themselves live in the files next to this one.
 */

/** COSMO's burn address — a token owned by it was spun, not held */
const SPIN_ADDRESS = "0xd3d5f29881ad87bb10c1100e2c709c9596de345f";

/** `GET /api/objekts/metadata/:slug` */
export type Metadata = { total: number; spin: number; transferable: number };

/** `GET /api/objekts/list/:slug` — every minted serial, ascending, unpaged */
export type SerialList = { serials: number[] };

/** `GET /api/objekts/transfers/:slug/:serial`, newest event first */
export type TransferRow = { id: string; to: string; timestamp: string; nickname?: string };
export type TransferResponse = {
  tokenId?: string;
  owner?: string;
  transferable?: boolean;
  /** the owner marked their serials private */
  hide?: boolean;
  transfers: TransferRow[];
};

/** one ownership change, already resolved to the owner it produced */
export type TimelineEvent = {
  id: string;
  kind: EventKind;
  /** nickname, `0x1234…abcd`, or COSMO for a spin */
  owner: string;
  /** render the owner in mono — it is a raw address, not a nickname */
  mono: boolean;
  at: Date;
};

/**
 * What a timeline row's pill says and wears. All four kinds — the three events
 * plus "this is where the token sits now" — share one treatment, one casing
 * and one glyph slot, because they all answer the same question about the row.
 */
type EventBadge = { label: string; icon: Icon };

export const EVENT_BADGE: Record<EventKind, EventBadge> = {
  mint: { label: "Minted", icon: SparkleIcon },
  transfer: { label: "Transferred", icon: ArrowRightIcon },
  spin: { label: "Spun", icon: ArrowsClockwiseIcon },
};

/** the newest non-spin row: whoever holds the token now */
export const CURRENT_BADGE: EventBadge = { label: "Current", icon: CheckIcon };

export function EventPill({ badge }: { badge: EventBadge }) {
  return (
    <Badge variant="outline" size="sm" className="flex-none gap-1 font-normal">
      <badge.icon className="size-3" aria-hidden />
      {badge.label}
    </Badge>
  );
}

/** live payload → timeline; the response is newest first, so the last row is the mint */
export function toTimeline(rows: TransferRow[]): TimelineEvent[] {
  return rows.map((row, i) => {
    const spun = row.to.toLowerCase() === SPIN_ADDRESS;
    const kind: EventKind = spun ? "spin" : i === rows.length - 1 ? "mint" : "transfer";
    return {
      id: row.id,
      kind,
      owner: spun ? "COSMO" : (row.nickname ?? truncateAddress(row.to)),
      mono: !spun && row.nickname === undefined,
      at: new Date(row.timestamp),
    };
  });
}

/** same shape from the offline fixtures */
export function fixtureTimeline(slug: string, serial: number): TimelineEvent[] {
  const rows = transfersFor(slug, serial);
  return rows.map((row, i) => {
    const kind: EventKind =
      row.to === SPIN_OWNER ? "spin" : i === rows.length - 1 ? "mint" : "transfer";
    return {
      id: row.id,
      kind,
      owner: row.to === SPIN_OWNER ? "COSMO" : row.to,
      mono: false,
      at: row.at,
    };
  });
}
