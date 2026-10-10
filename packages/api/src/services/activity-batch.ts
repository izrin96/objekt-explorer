import type { Collection, Objekt, Transfer } from "@repo/db/indexer/schema";
import { mapOwnedObjekt } from "@repo/lib/server/objekt";
import { fetchPublicNicknames } from "@repo/lib/server/user";

import type { ActivityItem } from "../schemas/activity";

/** One element of the indexer's `transfers` message. */
export type TransferData = Transfer & {
  collection: Collection;
  objekt: Objekt;
};

/** Rows for the live feed, in the batch's order, with the nicknames and objekts the feed draws. */
export async function enrichTransfers(transfers: TransferData[]): Promise<ActivityItem[]> {
  const nicknameOf = await fetchPublicNicknames(transfers.flatMap((a) => [a.from, a.to]));

  const batch: ActivityItem[] = [];
  for (const transfer of transfers) {
    if (transfer.collection.slug === "empty-collection") continue;

    const { objekt, collection, ...rest } = transfer;
    batch.push({
      nickname: {
        from: nicknameOf(transfer.from),
        to: nicknameOf(transfer.to),
      },
      transfer: rest,
      objekt: mapOwnedObjekt(objekt, collection),
    });
  }
  return batch;
}
