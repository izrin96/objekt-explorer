import { LOADER_READ_STALE_MS, orpc } from "@/lib/orpc";

// a tab still refetches on focus after the loader's read, and a staff action invalidates what it
// changed
export const queueOptions = () =>
  orpc.moderation.queue.queryOptions({ staleTime: LOADER_READ_STALE_MS });

export const accountOptions = (userId: string) =>
  orpc.moderation.account.queryOptions({
    input: { userId },
    staleTime: LOADER_READ_STALE_MS,
    retry: false,
  });

export const addressHistoryOptions = (address: string) =>
  orpc.moderation.addressHistory.queryOptions({
    input: { address },
    staleTime: LOADER_READ_STALE_MS,
    retry: false,
  });
