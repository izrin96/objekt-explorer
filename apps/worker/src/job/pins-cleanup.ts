import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { lockedObjekts, pins } from "@repo/db/schema";
import { inArray } from "drizzle-orm";

export async function cleanupUnownedObjekts() {
  console.log("[Pins Cleanup] Starting cleanup job");

  const allPins = await db
    .select({ id: pins.id, address: pins.address, tokenId: pins.tokenId })
    .from(pins);
  const allLocked = await db
    .select({
      id: lockedObjekts.id,
      address: lockedObjekts.address,
      tokenId: lockedObjekts.tokenId,
    })
    .from(lockedObjekts);

  if (allPins.length === 0 && allLocked.length === 0) {
    console.log("[Pins Cleanup] No pins or locked objekts found");
    return;
  }

  const allTokenIds = new Set<string>();
  for (const p of allPins) {
    allTokenIds.add(String(p.tokenId));
  }
  for (const l of allLocked) {
    allTokenIds.add(String(l.tokenId));
  }

  const currentObjekts = await indexer
    .select({ id: objekts.id, owner: objekts.owner })
    .from(objekts)
    .where(inArray(objekts.id, Array.from(allTokenIds)));

  const objektOwnerMap = new Map<string, string>();
  for (const obj of currentObjekts) {
    objektOwnerMap.set(obj.id, obj.owner.toLowerCase());
  }

  const pinsToRemove: number[] = [];
  for (const pin of allPins) {
    const owner = objektOwnerMap.get(String(pin.tokenId));
    if (!owner || owner !== pin.address.toLowerCase()) {
      pinsToRemove.push(pin.id);
    }
  }

  const lockedToRemove: number[] = [];
  for (const locked of allLocked) {
    const owner = objektOwnerMap.get(String(locked.tokenId));
    if (!owner || owner !== locked.address.toLowerCase()) {
      lockedToRemove.push(locked.id);
    }
  }

  if (pinsToRemove.length > 0) {
    await db.delete(pins).where(inArray(pins.id, pinsToRemove));
    console.log(`[Pins Cleanup] Removed ${pinsToRemove.length} pins`);
  }

  if (lockedToRemove.length > 0) {
    await db.delete(lockedObjekts).where(inArray(lockedObjekts.id, lockedToRemove));
    console.log(`[Pins Cleanup] Removed ${lockedToRemove.length} locked objekts`);
  }

  console.log(
    `[Pins Cleanup] Cleanup complete. Pins removed: ${pinsToRemove.length}, Locked removed: ${lockedToRemove.length}`,
  );
}
