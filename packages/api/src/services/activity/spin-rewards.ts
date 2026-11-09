import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { mapOwnedObjekt, mapTransfer } from "@repo/lib/server/objekt";
import { pairSpinsInWindows, type SpinEvent, spinNotes, spinWindows } from "@repo/lib/spin-pairing";
import { eq, inArray, sql } from "drizzle-orm";

import type { TransferItem } from "../../schemas/transfers";
import { getCollectionColumns } from "../objekt/collection-columns";

type PageRow = {
  transfer: { id: string; from: string; to: string; timestamp: string };
};

type SpinFields = Pick<TransferItem, "spin" | "rewardOf">;
type SpinReward = NonNullable<NonNullable<SpinFields["spin"]>["reward"]>;

/** the driver may hand a timestamptz back as a Date or a string */
type EventRow = {
  kind: "spin" | "mint";
  id: string;
  address: string;
  at: string | Date;
  artist: string;
};

/**
 * Adds each spin row's outcome and each reward row's spin. Rows are never
 * dropped: whether a reward shows as its own row is the reader's choice.
 */
export async function withSpinRewards<T extends PageRow>(rows: T[]): Promise<(T & SpinFields)[]> {
  const windows = spinWindows(
    rows.map(({ transfer }) => ({
      from: transfer.from,
      to: transfer.to,
      at: Date.parse(transfer.timestamp),
    })),
  );
  if (windows.length === 0) return rows;

  const addresses = windows.map((w) => w.address);
  const starts = windows.map((w) => new Date(w.from).toISOString());
  const ends = windows.map((w) => new Date(w.to).toISOString());

  const windowsSql = sql`unnest(
    ${sql.param(addresses)}::text[], ${sql.param(starts)}::timestamptz[], ${sql.param(ends)}::timestamptz[]
  ) AS w(address, lo, hi)`;
  const artistSql = sql`(SELECT artist FROM collection WHERE id = t.collection_id)`;

  const [events, clock] = await Promise.all([
    // the planner cannot see how narrow each window is, so it costs every probe as a long scan
    // and JIT-compiles the plan, which took 50-120 ms on prod against about 15 ms of reading
    indexer.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL jit = off`);
      return tx.execute<EventRow>(sql`
        SELECT 'mint' AS kind, t.id, w.address, t.timestamp AS at, ${artistSql} AS artist
        FROM ${windowsSql}
        CROSS JOIN LATERAL (
          SELECT id, timestamp, collection_id FROM transfer
          WHERE "from" = ${Addresses.NULL} AND "to" = w.address AND timestamp BETWEEN w.lo AND w.hi
        ) t
        UNION ALL
        SELECT 'spin', t.id, w.address, t.timestamp, ${artistSql}
        FROM ${windowsSql}
        CROSS JOIN LATERAL (
          SELECT id, timestamp, collection_id FROM transfer
          WHERE "from" = w.address AND "to" = ${Addresses.SPIN} AND timestamp BETWEEN w.lo AND w.hi
        ) t
      `);
    }),
    indexerClock(),
  ]);

  const spins: SpinEvent[] = [];
  const mints: SpinEvent[] = [];
  for (const row of events.rows) {
    const event = {
      id: row.id,
      address: row.address,
      at: new Date(row.at).getTime(),
      artist: row.artist,
    };
    (row.kind === "spin" ? spins : mints).push(event);
  }

  const notes = spinNotes(
    rows.map(({ transfer }) => ({ ...transfer, at: Date.parse(transfer.timestamp) })),
    pairSpinsInWindows(windows, spins, mints),
    clock,
  );

  const rewardIds = [...notes.values()].flatMap((note) =>
    note.kind === "spin" && note.rewardId ? [note.rewardId] : [],
  );
  const rewards = await readRewards(rewardIds);

  return rows.map((row) => {
    const note = notes.get(row.transfer.id);
    if (!note) return row;
    if (note.kind === "reward") return { ...row, rewardOf: note.spinId };
    const reward = note.rewardId ? rewards.get(note.rewardId) : undefined;
    return { ...row, spin: { outcome: note.outcome, ...(reward && { reward }) } };
  });
}

/** The newest indexed transfer's time, so a lagging indexer reads as pending, not broke. */
async function indexerClock() {
  const result = await indexer.execute<{ at: string | Date | null }>(
    sql`SELECT max(timestamp) AS at FROM transfer`,
  );
  const at = result.rows[0]?.at;
  return at ? new Date(at).getTime() : Date.now();
}

async function readRewards(ids: string[]): Promise<Map<string, SpinReward>> {
  if (ids.length === 0) return new Map();
  const rows = await indexer
    .select({
      transfer: {
        id: transfers.id,
        from: transfers.from,
        to: transfers.to,
        timestamp: transfers.timestamp,
      },
      objekt: objekts,
      collection: getCollectionColumns(),
    })
    .from(transfers)
    .innerJoin(objekts, eq(transfers.objektId, objekts.id))
    .innerJoin(collections, eq(transfers.collectionId, collections.id))
    .where(inArray(transfers.id, ids));
  return new Map(
    rows.map((row) => [
      row.transfer.id,
      { transfer: mapTransfer(row.transfer), objekt: mapOwnedObjekt(row.objekt, row.collection) },
    ]),
  );
}
