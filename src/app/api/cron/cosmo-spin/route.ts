import { and, eq, inArray } from "drizzle-orm";
import { indexerWritable as indexer } from "@/lib/server/db/indexer";
import { objekts } from "@/lib/server/db/indexer/schema";
import { SPIN_ADDRESS } from "@/lib/utils";

export async function POST() {
  // get all objekt sent to cosmo-spin and transferable = true
  const spinObjekts = await indexer
    .select({
      id: objekts.id,
    })
    .from(objekts)
    .where(and(eq(objekts.owner, SPIN_ADDRESS), eq(objekts.transferable, true)));

  // set transferable to false in batches
  const BATCH_SIZE = 150;
  if (spinObjekts.length) {
    for (let i = 0; i < spinObjekts.length; i += BATCH_SIZE) {
      const batch = spinObjekts.slice(i, i + BATCH_SIZE);
      await indexer
        .update(objekts)
        .set({
          transferable: false,
        })
        .where(
          inArray(
            objekts.id,
            batch.map((a) => a.id),
          ),
        );
      console.log(`Updated ${batch.length} rows`);
    }
  }

  return Response.json({
    status: "ok",
  });
}
