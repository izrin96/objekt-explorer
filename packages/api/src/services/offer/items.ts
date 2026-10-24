import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { transfers } from "@repo/db/indexer/schema";
import { and, gte, inArray } from "drizzle-orm";

import {
  anyCopyShortfall,
  firstItemRefusal,
  inAnyCopyScope,
  itemVerdict,
  specificCopyShortfall,
} from "../../lib/offer-rules";
import { transferKey } from "../../lib/trade-match";
import { unique } from "../../lib/unique";
import { usedTransfers } from "../trade-verify";
import {
  type Tx,
  copyKey,
  fetchCopies,
  fetchObjekts,
  openAnyCopyLegs,
  refuseOffer,
  reservedIds,
} from "./core";

export type Side = "give" | "get";
export type ItemRow = { side: Side; collectionSlug: string; objektId: string | null };

type ItemParties = {
  giverId: (side: Side) => string;
  /** where a side's specific objekts may sit */
  holders: (side: Side) => ReadonlySet<string>;
  /** where a side's any-copy copies are counted */
  copyHolders: (side: Side) => ReadonlySet<string>;
  /**
   * Accept only: a specific objekt the giver already sent to the receiver after the offer
   * was made counts as held, so an early sender doesn't sink their own trade. A transfer
   * that already verified another trade's leg doesn't, since it can't verify this one.
   */
  sent?: { since: string; receivers: (side: Side) => ReadonlySet<string> };
  /** Send only: the copies a get side's any-copy asks may draw on (see `anyCopyScope`) */
  getScope?: ReadonlyMap<string, ReadonlySet<string> | null>;
};

/**
 * Specific objekts that went from the side's giver to its receiver at or after `since`, in a
 * transfer no trade leg has recorded yet.
 */
async function sentEarly(items: ItemRow[], parties: ItemParties, tx: Tx | typeof db) {
  const sent = new Set<string>();
  if (!parties.sent || items.length === 0) return sent;
  const { since, receivers } = parties.sent;
  const rows = await Promise.all(
    (["give", "get"] as const).map((side) => {
      const ids = items.filter((i) => i.side === side).map((i) => i.objektId!);
      const from = [...parties.holders(side)];
      const to = [...receivers(side)];
      if (ids.length === 0 || from.length === 0 || to.length === 0) return Promise.resolve([]);
      return indexer
        .select({ objektId: transfers.objektId, hash: transfers.hash, tokenId: transfers.tokenId })
        .from(transfers)
        .where(
          and(
            inArray(transfers.objektId, ids),
            inArray(transfers.from, from),
            inArray(transfers.to, to),
            gte(transfers.timestamp, since),
          ),
        );
    }),
  );
  const found = rows.flat();
  const used = await usedTransfers(
    tx,
    found.map((row) => row.hash),
  );
  for (const row of found) {
    if (row.objektId && !used.has(transferKey(row))) sent.add(row.objektId);
  }
  return sent;
}

type CopyNeed = {
  side: Side;
  giverId: string;
  held: Map<string, number>;
  /** collections the side names a specific objekt in, which open any-copy legs must leave a copy for */
  specificSlugs: string[];
  /** the copies behind `held`, so accept can drop the ones another accept reserved since */
  counted: { id: string; slug: string }[];
};

/**
 * Specific objekts must sit with the side that gives them, transferable and unreserved;
 * any-copy items need as many such copies, beyond the ones named and the ones already
 * promised to open any-copy legs, as the offer asks for, and a named copy must not be one
 * those legs already count on. Returns the copies counted before
 * the promised ones, so accept can recheck those under its lock.
 */
export async function checkItems(
  items: ItemRow[],
  parties: ItemParties,
  tx: Tx | typeof db = db,
): Promise<CopyNeed[]> {
  const specific = items.filter((item) => item.objektId !== null);
  const anyCopy = items.filter((item) => item.objektId === null);
  const slugsOf = (side: Side) =>
    unique(anyCopy.filter((item) => item.side === side).map((item) => item.collectionSlug));
  const found = await fetchObjekts(specific.map((item) => item.objektId!));
  const elsewhere = specific.filter((item) => {
    const owner = found.get(item.objektId!)?.owner;
    return owner !== undefined && parties.sent?.receivers(item.side).has(owner);
  });
  const early = await sentEarly(elsewhere, parties, tx);
  const specificSlugsOf = (side: Side) =>
    unique(
      specific
        .filter((item) => item.side === side && !early.has(item.objektId!))
        .map((item) => item.collectionSlug),
    );
  const copies = await Promise.all(
    (["give", "get"] as const).map((side) =>
      fetchCopies(unique([...slugsOf(side), ...specificSlugsOf(side)]), [
        ...parties.copyHolders(side),
      ]),
    ),
  );
  const reserved = await reservedIds(
    [...specific.map((item) => item.objektId!), ...copies.flat().map((o) => o.id)],
    tx,
  );

  const refusal = firstItemRefusal(
    specific.map((item) => {
      const objekt = found.get(item.objektId!);
      const valid = objekt && objekt.slug === item.collectionSlug ? objekt : undefined;
      return {
        objektId: item.objektId!,
        verdict: early.has(item.objektId!)
          ? "ok"
          : itemVerdict(valid, parties.holders(item.side), reserved.has(item.objektId!)),
      };
    }),
  );
  if (refusal) refuseOffer(refusal.reason, { objektIds: refusal.objektIds });

  const named = new Set(specific.map((item) => item.objektId!));
  const needs = (["give", "get"] as const).map((side, i): CopyNeed => {
    const counted: CopyNeed["counted"] = [];
    for (const copy of copies[i]!) {
      if (!copy.transferable || reserved.has(copy.id) || named.has(copy.id)) continue;
      const asked = side === "get" && slugsOf(side).includes(copy.slug);
      if (asked && parties.getScope && !inAnyCopyScope(parties.getScope, copy)) continue;
      counted.push({ id: copy.id, slug: copy.slug });
    }
    return {
      side,
      giverId: parties.giverId(side),
      held: countCopies(counted).held,
      specificSlugs: specificSlugsOf(side),
      counted,
    };
  });
  await refuseCopyShortfall(anyCopy, needs, tx);
  return needs;
}

function countCopies(counted: CopyNeed["counted"]) {
  const held = new Map<string, number>();
  for (const copy of counted) held.set(copy.slug, (held.get(copy.slug) ?? 0) + 1);
  return { held };
}

/**
 * Under the givers' any-copy locks, `recheck` first drops the counted copies that an accept
 * committed since reserved by name, which the open any-copy legs alone would miss.
 */
export async function refuseCopyShortfall(
  anyCopy: ItemRow[],
  counted: CopyNeed[],
  tx: Tx | typeof db,
  recheck = false,
) {
  const reservedSince = recheck
    ? await reservedIds(
        counted.flatMap((need) => need.counted.map((copy) => copy.id)),
        tx,
      )
    : new Set<string>();
  const needs =
    reservedSince.size === 0
      ? counted
      : counted.map((need) =>
          Object.assign(
            {},
            need,
            countCopies(need.counted.filter((copy) => !reservedSince.has(copy.id))),
          ),
        );
  const slugsOf = (need: CopyNeed) =>
    unique(
      anyCopy
        .filter((i) => i.side === need.side)
        .map((i) => i.collectionSlug)
        .concat(need.specificSlugs),
    );
  if (needs.every((need) => slugsOf(need).length === 0)) return;
  const promised = await openAnyCopyLegs(
    needs.map((need) => ({ userId: need.giverId, slugs: slugsOf(need) })),
    tx,
  );
  const short = needs.flatMap((need) => {
    const leftOf = (counts: ReadonlyMap<string, number>) =>
      new Map(
        slugsOf(need).map((slug) => [
          slug,
          (counts.get(slug) ?? 0) - (promised.get(copyKey(need.giverId, slug)) ?? 0),
        ]),
      );
    return anyCopyShortfall(
      anyCopy.filter((item) => item.side === need.side),
      leftOf(need.held),
    ).concat(specificCopyShortfall(need.specificSlugs, leftOf(need.held)));
  });
  if (short.length > 0) refuseOffer("not_owned", { collectionSlugs: unique(short) });
}
