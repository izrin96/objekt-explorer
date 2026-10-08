import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { transfers } from "@repo/db/indexer/schema";
import { and, gte, inArray } from "drizzle-orm";

import { anyCopyShortfall, firstItemRefusal, itemVerdict } from "../../lib/offer-rules";
import { unique } from "../../lib/unique";
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
   * was made counts as held, so an early sender doesn't sink their own trade.
   */
  sent?: { since: string; receivers: (side: Side) => ReadonlySet<string> };
};

/** Specific objekts that went from the side's giver to its receiver at or after `since`. */
async function sentEarly(items: ItemRow[], parties: ItemParties) {
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
        .select({ objektId: transfers.objektId })
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
  for (const row of rows.flat()) if (row.objektId) sent.add(row.objektId);
  return sent;
}

type CopyNeed = { side: Side; giverId: string; available: Map<string, number> };

/**
 * Specific objekts must sit with the side that gives them, transferable and unreserved;
 * any-copy items need as many such copies, beyond the ones named and the ones already
 * promised to open any-copy legs, as the offer asks for. Returns the copies counted before
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
  const [found, copies] = await Promise.all([
    fetchObjekts(specific.map((item) => item.objektId!)),
    Promise.all(
      (["give", "get"] as const).map((side) =>
        fetchCopies(slugsOf(side), [...parties.copyHolders(side)]),
      ),
    ),
  ]);
  const reserved = await reservedIds(
    [...specific.map((item) => item.objektId!), ...copies.flat().map((o) => o.id)],
    tx,
  );
  const elsewhere = specific.filter((item) => {
    const owner = found.get(item.objektId!)?.owner;
    return owner !== undefined && parties.sent?.receivers(item.side).has(owner);
  });
  const early = await sentEarly(elsewhere, parties);

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
    const available = new Map<string, number>();
    for (const copy of copies[i]!) {
      if (!copy.transferable || reserved.has(copy.id) || named.has(copy.id)) continue;
      available.set(copy.slug, (available.get(copy.slug) ?? 0) + 1);
    }
    return { side, giverId: parties.giverId(side), available };
  });
  await refuseCopyShortfall(anyCopy, needs, tx);
  return needs;
}

export async function refuseCopyShortfall(
  anyCopy: ItemRow[],
  needs: CopyNeed[],
  tx: Tx | typeof db,
) {
  if (anyCopy.length === 0) return;
  const promised = await openAnyCopyLegs(
    needs.map((need) => ({
      userId: need.giverId,
      slugs: unique(anyCopy.filter((i) => i.side === need.side).map((i) => i.collectionSlug)),
    })),
    tx,
  );
  const short = needs.flatMap((need) => {
    const left = new Map(
      [...need.available].map(([slug, n]) => [
        slug,
        n - (promised.get(copyKey(need.giverId, slug)) ?? 0),
      ]),
    );
    return anyCopyShortfall(
      anyCopy.filter((item) => item.side === need.side),
      left,
    );
  });
  if (short.length > 0) refuseOffer("not_owned", { collectionSlugs: unique(short) });
}
