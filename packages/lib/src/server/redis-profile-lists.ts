import { RedisClient } from "bun";

const redis = new RedisClient(process.env.REDIS_URL || "");

const CACHE_TTL_SECONDS = 3600; // 1 hour
const CACHE_KEY_PREFIX = "profile-lists:";

interface ProfileListCacheEntry {
  listId: number;
  profileAddress: string;
  objektIds: string[];
}

export async function getProfileLists(address: string): Promise<ProfileListCacheEntry[] | null> {
  const key = `${CACHE_KEY_PREFIX}${address.toLowerCase()}`;
  const data = await redis.get(key);

  if (!data) return null;

  try {
    return JSON.parse(data) as ProfileListCacheEntry[];
  } catch {
    return null;
  }
}

export async function setProfileLists(
  address: string,
  data: ProfileListCacheEntry[],
): Promise<void> {
  const key = `${CACHE_KEY_PREFIX}${address.toLowerCase()}`;
  await redis.set(key, JSON.stringify(data));
  await redis.expire(key, CACHE_TTL_SECONDS);
}

export async function invalidateProfileList(address: string): Promise<void> {
  const key = `${CACHE_KEY_PREFIX}${address.toLowerCase()}`;
  await redis.del(key);
}

export async function updateProfileListObjektIds(
  address: string,
  listId: number,
  objektIds: string[],
): Promise<void> {
  const key = `${CACHE_KEY_PREFIX}${address.toLowerCase()}`;
  const existing = await getProfileLists(address);

  if (!existing) {
    return;
  }

  const entryIndex = existing.findIndex((e) => e.listId === listId);
  if (entryIndex === -1) return;

  const updated = [...existing];
  const target = updated[entryIndex] as ProfileListCacheEntry;
  updated[entryIndex] = Object.assign(target, { objektIds });

  await redis.set(key, JSON.stringify(updated));
  await redis.expire(key, CACHE_TTL_SECONDS);
}

export async function removeObjektFromProfileLists(
  address: string,
  objektIdsToRemove: string[],
): Promise<void> {
  const existing = await getProfileLists(address);
  if (!existing) return;

  const objektIdSet = new Set(objektIdsToRemove);

  const updated: ProfileListCacheEntry[] = [];
  for (const entry of existing) {
    const filteredObjektIds = entry.objektIds.filter((id) => !objektIdSet.has(id));
    if (filteredObjektIds.length > 0) {
      updated.push(Object.assign(entry, { objektIds: filteredObjektIds }));
    }
  }

  if (updated.length === 0) {
    await invalidateProfileList(address);
  } else {
    await setProfileLists(address, updated);
  }
}

export async function addProfileListToCache(entry: ProfileListCacheEntry): Promise<void> {
  const address = entry.profileAddress;
  const existing = await getProfileLists(address);

  if (!existing) {
    await setProfileLists(address, [entry]);
  } else {
    const updated = [...existing, entry];
    await setProfileLists(address, updated);
  }
}
