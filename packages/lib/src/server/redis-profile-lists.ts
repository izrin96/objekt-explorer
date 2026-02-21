import { RedisClient } from "bun";

const redisUrl = process.env.REDIS_URL;
const redis = redisUrl ? new RedisClient(redisUrl) : null;

const CACHE_TTL_SECONDS = 3600; // 1 hour
const CACHE_KEY_PREFIX = "profile-lists:";

interface ProfileListCacheEntry {
  listId: number;
  profileAddress: string;
  objektIds: string[];
}

export async function getProfileLists(address: string): Promise<ProfileListCacheEntry[] | null> {
  if (!redis) return null;

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
  if (!redis) return;

  const key = `${CACHE_KEY_PREFIX}${address.toLowerCase()}`;
  await redis.set(key, JSON.stringify(data));
  await redis.expire(key, CACHE_TTL_SECONDS);
}

export async function invalidateProfileList(address: string): Promise<void> {
  if (!redis) return;

  const key = `${CACHE_KEY_PREFIX}${address.toLowerCase()}`;
  await redis.del(key);
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
      updated.push({ ...entry, objektIds: filteredObjektIds });
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
    await setProfileLists(address, [...existing, entry]);
  }
}

export async function addObjektIdsToProfileList(
  address: string,
  listId: number,
  newObjektIds: string[],
): Promise<void> {
  if (!redis || newObjektIds.length === 0) return;

  const existing = await getProfileLists(address);
  if (!existing) return;

  const entryIndex = existing.findIndex((e) => e.listId === listId);
  if (entryIndex === -1) return;

  const target = existing[entryIndex]!;
  const existingSet = new Set(target.objektIds);
  for (const id of newObjektIds) {
    existingSet.add(id);
  }

  const updated = [
    ...existing.slice(0, entryIndex),
    { ...target, objektIds: [...existingSet] },
    ...existing.slice(entryIndex + 1),
  ];

  await redis.set(`${CACHE_KEY_PREFIX}${address.toLowerCase()}`, JSON.stringify(updated));
  await redis.expire(`${CACHE_KEY_PREFIX}${address.toLowerCase()}`, CACHE_TTL_SECONDS);
}

export async function removeObjektIdsFromProfileList(
  address: string,
  listId: number,
  objektIdsToRemove: string[],
): Promise<void> {
  if (!redis || objektIdsToRemove.length === 0) return;

  const existing = await getProfileLists(address);
  if (!existing) return;

  const entryIndex = existing.findIndex((e) => e.listId === listId);
  if (entryIndex === -1) return;

  const target = existing[entryIndex]!;
  const removeSet = new Set(objektIdsToRemove);
  const filteredObjektIds = target.objektIds.filter((id) => !removeSet.has(id));

  const updated = [
    ...existing.slice(0, entryIndex),
    { ...target, objektIds: filteredObjektIds },
    ...existing.slice(entryIndex + 1),
  ];

  await redis.set(`${CACHE_KEY_PREFIX}${address.toLowerCase()}`, JSON.stringify(updated));
  await redis.expire(`${CACHE_KEY_PREFIX}${address.toLowerCase()}`, CACHE_TTL_SECONDS);
}
