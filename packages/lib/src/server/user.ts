import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";

export async function fetchKnownAddresses(addresses: string[]) {
  if (addresses.length === 0) return [];
  const result = await db
    .selectDistinctOn([userAddress.address], {
      address: userAddress.address,
      nickname: userAddress.nickname,
      hideNickname: userAddress.hideNickname,
    })
    .from(userAddress)
    .where(
      inArray(
        userAddress.address,
        addresses.map((a) => a.toLowerCase()),
      ),
    )
    .orderBy(userAddress.address, desc(userAddress.id));
  return result;
}

export async function fetchUserProfiles(id: string) {
  const result = await db
    .select({
      address: userAddress.address,
      nickname: userAddress.nickname,
    })
    .from(userAddress)
    .where(eq(userAddress.userId, id))
    .orderBy(desc(userAddress.id));
  return result;
}

const CACHE_USERS_LOCK = 7_416_357_294_001_337n;

export async function cacheUsers(
  newAddresses: { nickname: string; address: string; cosmoId?: number }[],
  { waitForLock = true }: { waitForLock?: boolean } = {},
) {
  if (newAddresses.length === 0) return;

  // one row per conflict target, sorted so concurrent callers lock in the same order
  const byAddress = new Map<
    string,
    { nickname: string; address: string; cosmoId: number | null }
  >();
  for (const a of newAddresses) {
    byAddress.set(a.address.toLowerCase(), {
      nickname: a.nickname,
      address: a.address,
      cosmoId: a.cosmoId ?? null,
    });
  }

  const values = [...byAddress.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, a]) => ({
      nickname: a.nickname,
      address: a.address,
      cosmoId: a.cosmoId,
      lastCosmoCheck: sql`'now'`,
    }));

  try {
    await db.transaction(async (tx) => {
      // unbind and insert lock disjoint rows, so sorting alone cannot order them
      // globally. xact-scoped lock releases on commit, safe behind pgbouncer.
      if (waitForLock) {
        await tx.execute(sql`select pg_advisory_xact_lock(${CACHE_USERS_LOCK}::bigint)`);
      } else {
        const lock = await tx.execute<{ locked: boolean }>(
          sql`select pg_try_advisory_xact_lock(${CACHE_USERS_LOCK}::bigint) as locked`,
        );

        // caching is best-effort: drop the batch rather than hold a pooled connection
        if (!lock.rows[0]?.locked) return;
      }

      // clear nickname from any existing row that has the same nickname
      // but different address (unbind before insert)
      await tx
        .update(userAddress)
        .set({ nickname: null, cosmoId: null, lastCosmoCheck: null })
        .where(
          and(
            inArray(
              userAddress.nickname,
              values.map((v) => v.nickname),
            ),
            notInArray(
              userAddress.address,
              values.map((v) => v.address),
            ),
          ),
        );

      await tx
        .insert(userAddress)
        .values(values)
        .onConflictDoUpdate({
          target: userAddress.address,
          set: {
            nickname: sql.raw(`excluded.${userAddress.nickname.name}`),
            cosmoId: sql`coalesce(excluded.${sql.raw(userAddress.cosmoId.name)}, ${userAddress.cosmoId})`,
            lastCosmoCheck: sql`'now'`,
          },
        });
    });
  } catch (err) {
    console.error("Bulk user caching failed:", err);
  }
}
