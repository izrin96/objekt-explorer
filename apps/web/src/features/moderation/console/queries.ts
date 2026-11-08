import { orpc } from "@/lib/orpc";

// 10s: long enough that the page does not refetch what its loader just read; a tab still
// refetches on focus after that, and a staff action invalidates what it changed
export const queueOptions = () => orpc.moderation.queue.queryOptions({ staleTime: 10_000 });

export const accountOptions = (userId: string) =>
  orpc.moderation.account.queryOptions({ input: { userId }, staleTime: 10_000, retry: false });

export const addressHistoryOptions = (address: string) =>
  orpc.moderation.addressHistory.queryOptions({
    input: { address },
    staleTime: 10_000,
    retry: false,
  });
