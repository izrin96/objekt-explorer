import { fetchByNickname } from "@repo/cosmo/server/user";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { eq, and, isNotNull, count, sql, inArray } from "drizzle-orm";

interface FetchError {
  data?: {
    error?: {
      code: string;
    };
  };
}

async function safeFetchByNickname(nickname: string) {
  try {
    return await fetchByNickname(nickname);
  } catch (err) {
    const error = err as FetchError;
    if (error.data?.error?.code === "USER_NOT_FOUND") {
      return null;
    }
    console.error(`Failed to fetch nickname "${nickname}":`, err);
    return undefined;
  }
}

export async function cleanupAddressNickname() {
  console.log("Finding duplicate nicknames with multiple addresses...");

  const duplicateNicknames = await db
    .select({
      nickname: userAddress.nickname,
      count: count(userAddress.nickname),
    })
    .from(userAddress)
    .where(isNotNull(userAddress.nickname))
    .groupBy(userAddress.nickname)
    .having(({ count }) => sql`${count} > 1`);

  if (duplicateNicknames.length === 0) {
    console.log("No duplicates found.");
    return;
  }

  console.log(`Found ${duplicateNicknames.length} duplicate nickname groups.`);

  const filtered = duplicateNicknames
    .map((r) => r.nickname?.toLowerCase())
    .filter((nickname): nickname is string => nickname !== null);

  const records = await db
    .select({
      nickname: userAddress.nickname,
      address: userAddress.address,
    })
    .from(userAddress)
    .where(inArray(userAddress.nickname, filtered))
    .orderBy(userAddress.nickname, userAddress.id);

  const recordNicknames = new Set(filtered);

  const groups = new Map<string, typeof records>();
  for (const row of records) {
    if (!row.nickname || !recordNicknames.has(row.nickname.toLowerCase())) continue;
    const existing = groups.get(row.nickname.toLowerCase());
    if (existing) {
      existing.push(row);
    } else {
      groups.set(row.nickname.toLowerCase(), [row]);
    }
  }

  let processed = 0;
  let unbound = 0;

  for (const [nickname, group] of groups) {
    const addresses = group.map((r) => r.address);

    console.log(`\nProcessing "${nickname}":`, addresses);

    const user = await safeFetchByNickname(nickname);

    if (user === undefined) {
      console.log(`  ⚠️ Skipping due to API error`);
      continue;
    }

    if (user === null) {
      console.log(`  ⚠️ User not found in Cosmo - unbinding all`);
      for (const address of addresses) {
        await db
          .update(userAddress)
          .set({ nickname: null, cosmoId: null, lastCosmoCheck: null })
          .where(and(eq(userAddress.nickname, nickname), eq(userAddress.address, address)));
        unbound++;
      }
      continue;
    }

    const correctAddress = user.address.toLowerCase();
    console.log(`  ✓ Cosmo says: ${correctAddress}`);

    for (const address of addresses) {
      if (address.toLowerCase() !== correctAddress) {
        console.log(`  ✗ Unbinding stale address ${address}`);
        await db
          .update(userAddress)
          .set({ nickname: null, cosmoId: null, lastCosmoCheck: null })
          .where(and(eq(userAddress.nickname, nickname), eq(userAddress.address, address)));
        unbound++;
      } else {
        console.log(`  ✓ Keeping correct address ${address}`);
      }
    }

    processed++;
  }

  console.log(`\nDone. Processed ${processed} groups, unbound ${unbound} addresses.`);
}

await cleanupAddressNickname();
