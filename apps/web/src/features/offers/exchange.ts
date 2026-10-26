import type { TradeView as Trade } from "@repo/api/schemas/offer";

import { getCollectionShortNo } from "@/features/objekt/objekt-utils";

import { type Leg, type LegChip, legChip } from "./next-step";
import type { Collections, OfferSide } from "./pick";

type LegWarning = "stuck" | "away";

export type LegStatus = {
  chip: LegChip;
  /** the viewer can send it, or a different copy of it waits on the viewer */
  needsYou: boolean;
  warning: LegWarning | null;
};

export function legStatus(leg: Leg, ended: boolean): LegStatus {
  const chip = legChip(leg, ended);
  const live = !ended && leg.state === "waiting";
  return {
    chip,
    needsYou: chip === "sendThis" || (chip === "differentCopy" && !leg.fromYou),
    warning: live && leg.stuck ? "stuck" : live && leg.away ? "away" : null,
  };
}

export type ExchangeFilter = "all" | "needsYou" | "waiting" | "verified";

export type GroupKey = "send" | "decide" | "stuck" | "waiting" | "verified" | "notSent";

const GROUP_ORDER: GroupKey[] = ["send", "decide", "stuck", "waiting", "verified", "notSent"];

function groupOf(leg: Leg, status: LegStatus): GroupKey {
  switch (status.chip) {
    case "sendThis":
      return "send";
    case "differentCopy":
      return status.needsYou ? "decide" : "waiting";
    case "waiting":
      // the viewer owes it but can't send it: it waits on nobody
      return leg.fromYou && status.warning === "stuck" ? "stuck" : "waiting";
    case "verified":
      return "verified";
    case "notSent":
      return "notSent";
  }
}

const FILTERS: Record<ExchangeFilter, (key: GroupKey) => boolean> = {
  all: () => true,
  needsYou: (key) => key === "send" || key === "decide",
  waiting: (key) => key === "waiting",
  verified: (key) => key === "verified",
};

type Profile = NonNullable<Leg["heldBy"]>;

export type ExchangeGroup = {
  key: GroupKey;
  /** set on a Send these group split by the profile holding its objekts */
  profile: Profile | null;
  /** the any-copy rest of a split Send these, which no single profile holds */
  anyCopy?: boolean;
  legs: Leg[];
};

/** Member or collection code holds the text, ignoring case; a blank text keeps everything. */
export function findMatches(leg: Leg, find: string, collections: Collections) {
  const text = find.trim().toLowerCase();
  if (text === "") return true;
  const collection = collections[leg.collectionSlug];
  const haystack = collection
    ? [collection.member, collection.collectionNo, getCollectionShortNo(collection)]
    : [leg.collectionSlug];
  return haystack.some((value) => value.toLowerCase().includes(text));
}

/**
 * Send these, one group per profile once the owed objekts sit on two or more; then a named objekt
 * on none of them (away, or not read yet), and any copy last.
 */
function splitSend(legs: Leg[]): ExchangeGroup[] {
  const byProfile = new Map<string, { profile: Profile; legs: Leg[] }>();
  const unheld: Leg[] = [];
  const anyCopy: Leg[] = [];
  for (const leg of legs) {
    if (!leg.heldBy) {
      (leg.objektId === null ? anyCopy : unheld).push(leg);
      continue;
    }
    const entry = byProfile.get(leg.heldBy.address) ?? { profile: leg.heldBy, legs: [] };
    entry.legs.push(leg);
    byProfile.set(leg.heldBy.address, entry);
  }
  if (byProfile.size < 2) return [{ key: "send", profile: null, legs }];
  return [
    ...[...byProfile.values()].map(({ profile, legs: held }) => ({
      key: "send" as const,
      profile,
      legs: held,
    })),
    ...(unheld.length > 0 ? [{ key: "send" as const, profile: null, legs: unheld }] : []),
    ...(anyCopy.length > 0
      ? [{ key: "send" as const, profile: null, anyCopy: true, legs: anyCopy }]
      : []),
  ];
}

/** One side's legs grouped in spec order, narrowed by the filter and the find text. */
export function exchangeGroups(
  legs: Leg[],
  {
    ended,
    filter = "all",
    find = "",
    collections,
  }: { ended: boolean; filter?: ExchangeFilter; find?: string; collections: Collections },
): ExchangeGroup[] {
  const buckets = new Map<GroupKey, Leg[]>(GROUP_ORDER.map((key) => [key, []]));
  for (const leg of legs) {
    const key = groupOf(leg, legStatus(leg, ended));
    if (FILTERS[filter](key) && findMatches(leg, find, collections)) buckets.get(key)!.push(leg);
  }
  return GROUP_ORDER.flatMap((key) => {
    const kept = buckets.get(key)!;
    if (kept.length === 0) return [];
    return key === "send" ? splitSend(kept) : [{ key, profile: null, legs: kept }];
  });
}

/** What each filter chip counts over these legs. */
export function filterCounts(legs: Leg[], ended: boolean): Record<ExchangeFilter, number> {
  const counts = { all: legs.length, needsYou: 0, waiting: 0, verified: 0 };
  for (const leg of legs) {
    const key = groupOf(leg, legStatus(leg, ended));
    if (FILTERS.needsYou(key)) counts.needsYou++;
    if (key === "waiting") counts.waiting++;
    if (key === "verified") counts.verified++;
  }
  return counts;
}

/** Different copies the partner sent, each waiting on the viewer's Accept or Refuse. */
export function decideCount(legs: Leg[], ended: boolean) {
  return legs.filter((leg) => groupOf(leg, legStatus(leg, ended)) === "decide").length;
}

/** The status card's "Show the N that need you"; 0 once the trade ended. */
export function needsYouCount(trade: Pick<Trade, "status" | "legs">) {
  if (trade.status !== "in_progress") return 0;
  return trade.legs.filter((leg) => legStatus(leg, false).needsYou).length;
}

/** The phone tab a trade opens on: the side holding what needs the viewer, else You give. */
export function openingSide(trade: Pick<Trade, "status" | "legs">): OfferSide {
  if (trade.status !== "in_progress") return "give";
  const needs = (fromYou: boolean) =>
    trade.legs.some((leg) => leg.fromYou === fromYou && legStatus(leg, false).needsYou);
  return !needs(true) && needs(false) ? "get" : "give";
}
