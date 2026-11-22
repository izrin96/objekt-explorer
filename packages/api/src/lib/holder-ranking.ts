import type { HolderBucketKey, HoldersOutput } from "../schemas/collections";

// a tuple rather than an object: the largest collections cache ~25k of these
export type RankedHolder = [
  address: string,
  copies: number,
  lowestSerial: number,
  rank: number,
  nickname: string | null,
];

export type Ranking = {
  summary: HoldersOutput["summary"];
  holders: RankedHolder[];
};

export type HolderCount = { owner: string; copies: number; lowestSerial: number | null };

function bucketOf(copies: number): HolderBucketKey {
  if (copies === 1) return "1";
  if (copies <= 4) return "2-4";
  if (copies <= 9) return "5-9";
  return "10+";
}

/**
 * Ranks holders by copies, most first, ties by lowest serial; equal counts share a rank and the
 * next rank skips. `nicknames` is keyed by lowercased address.
 */
export function rankHolders(rows: HolderCount[], nicknames: Map<string, string | null>): Ranking {
  const sorted = rows.toSorted(
    (a, b) => b.copies - a.copies || (a.lowestSerial ?? 0) - (b.lowestSerial ?? 0),
  );

  const buckets = new Map<HolderBucketKey, { holders: number; copies: number }>([
    ["1", { holders: 0, copies: 0 }],
    ["2-4", { holders: 0, copies: 0 }],
    ["5-9", { holders: 0, copies: 0 }],
    ["10+", { holders: 0, copies: 0 }],
  ]);

  let copies = 0;
  const holders: RankedHolder[] = [];
  for (const [index, row] of sorted.entries()) {
    const previous = holders[index - 1];
    const rank = previous && previous[1] === row.copies ? previous[3] : index + 1;
    const address = row.owner.toLowerCase();
    holders.push([
      address,
      row.copies,
      row.lowestSerial ?? 0,
      rank,
      nicknames.get(address) ?? null,
    ]);

    const bucket = buckets.get(bucketOf(row.copies))!;
    bucket.holders += 1;
    bucket.copies += row.copies;
    copies += row.copies;
  }

  return {
    summary: {
      holders: holders.length,
      copies,
      buckets: Array.from(buckets, ([key, { holders, copies }]) => ({ key, holders, copies })),
    },
    holders,
  };
}
