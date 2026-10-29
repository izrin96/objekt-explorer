import { addr, Addresses } from "@repo/lib";

export type HeldTransfer = {
  id: string;
  tokenId: string;
  from: string;
  to: string;
  timestamp: string;
  hash: string;
  blockNumber: number;
  logIndex: number;
};

export type HeldTransferability = {
  transferable: boolean;
  blockNumber: number;
  transactionIndex: number;
};

/**
 * What replaying one token's held transfers writes. A new objekt takes its mint time from the
 * mint (the oldest row when the mint is not held) and its owner from the newest row; a known
 * objekt only moves when that row is not older than what it has. Mints get no outbox row, as in the
 * indexer, and the latest transferability change wins.
 */
export function planReplay({
  rows,
  objekt,
  updates,
  transferable,
}: {
  rows: HeldTransfer[];
  objekt: { receivedAt: string } | null;
  updates: HeldTransferability[];
  transferable: boolean;
}) {
  const ordered = rows.toSorted((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);
  const first = ordered[0];
  const newest = ordered.at(-1);
  if (!first || !newest) return null;

  const latest = updates
    .toSorted((a, b) => a.blockNumber - b.blockNumber || a.transactionIndex - b.transactionIndex)
    .at(-1);
  const mint = ordered.find((row) => row.from === Addresses.NULL) ?? first;
  const move = { owner: addr(newest.to), receivedAt: newest.timestamp };

  return {
    insert: objekt
      ? null
      : {
          ...move,
          mintedAt: mint.timestamp,
          transferable: latest?.transferable ?? transferable,
        },
    move: objekt && Date.parse(newest.timestamp) >= Date.parse(objekt.receivedAt) ? move : null,
    transferable: objekt ? (latest?.transferable ?? null) : null,
    transfers: ordered,
    outbox: ordered.filter((row) => row.from !== Addresses.NULL),
  };
}
