import { and, eq, gt, inArray } from "drizzle-orm";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts, transfers } from "@/lib/server/db/indexer/schema";
import { fetchMetadata } from "@/lib/server/objekts/objekt-metadata";
import { redis } from "@/lib/server/redis";
import { NULL_ADDRESS } from "@/lib/utils";

const REDIS_KEY = "TRANSFERABLE_LAST_CHECK";

export async function POST() {
  const lastTimestamp = await redis.get<string>(REDIS_KEY);

  if (!lastTimestamp) throw new Error("Last timestamp cannot be empty");

  const currentTimestamp = new Date().toISOString();

  // get all minted sco transfer (grid only) after last check timestamp
  const scoObjekts = await indexer
    .selectDistinct({
      to: transfers.to,
    })
    .from(transfers)
    .leftJoin(collections, eq(transfers.collectionId, collections.id))
    .where(
      and(
        gt(transfers.timestamp, lastTimestamp),
        eq(transfers.from, NULL_ADDRESS),
        eq(collections.class, "Special"),
        eq(collections.onOffline, "online"),
      ),
    );

  if (!scoObjekts.length)
    return Response.json({
      status: "ok",
    });

  // get all fco by owner that gridable / transferable = true
  // todo: maybe need to query into specific fco's collectionNo based on sco's collectionNo
  const fcoObjekts = await indexer
    .select({
      id: objekts.id,
    })
    .from(objekts)
    .leftJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        inArray(
          objekts.owner,
          scoObjekts.map((a) => a.to),
        ),
        eq(collections.class, "First"),
        eq(objekts.transferable, true),
      ),
    );

  if (!fcoObjekts.length)
    return Response.json({
      status: "ok",
    });

  const BATCH_SIZE = 50;
  for (let i = 0; i < fcoObjekts.length; i += BATCH_SIZE) {
    const batch = fcoObjekts.slice(i, i + BATCH_SIZE);

    // check metadata
    const metadataBatch = await Promise.allSettled(
      batch.map((e) => fetchMetadata(e.id.toString())),
    );

    const objektIds: number[] = [];

    for (let j = 0; j < metadataBatch.length; j++) {
      const request = metadataBatch[j];
      const currentObjekt = batch[j];
      if (request.status === "rejected") {
        console.error(`Unable to fetch metadata for token ${currentObjekt.id}`);
        continue;
      }

      if (!request.value.objekt.transferable) {
        objektIds.push(currentObjekt.id);
      }
    }

    // set transferable to false
    if (objektIds.length) {
      await indexer
        .update(objekts)
        .set({
          transferable: false,
        })
        .where(inArray(objekts.id, objektIds));
      console.log(`Updated ${objektIds.length} rows`);
    }
  }

  await redis.set(REDIS_KEY, currentTimestamp);

  return Response.json({
    status: "ok",
  });
}
