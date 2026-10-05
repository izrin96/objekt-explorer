import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { pins } from "@repo/db/schema";
import { chunkMap } from "@repo/lib";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { isAddressHiddenFromCaller } from "./privacy";
import { TOKEN_CHUNK_SIZE } from "./utils";

export async function getValidPins(address: string) {
  const allPins = await db
    .select({ id: pins.id, tokenId: pins.tokenId, order: pins.order })
    .from(pins)
    .where(eq(pins.address, address))
    .orderBy(asc(sql`COALESCE(${pins.order}, ${pins.id})`));

  if (allPins.length === 0) return [];

  const owned = await chunkMap(
    allPins.map((p) => String(p.tokenId)),
    TOKEN_CHUNK_SIZE,
    (batch) =>
      indexer
        .select({ id: objekts.id })
        .from(objekts)
        .where(and(inArray(objekts.id, batch), eq(objekts.owner, address.toLowerCase()))),
  );

  const ownedSet = new Set(owned.map((o) => o.id));
  return allPins.filter((p) => ownedSet.has(String(p.tokenId)));
}

export async function fetchPins(address: string) {
  if (await isAddressHiddenFromCaller(address)) return [];
  const validPins = await getValidPins(address);
  return validPins.map((a) => ({
    tokenId: a.tokenId.toString(),
    order: a.order ?? a.id,
  }));
}
