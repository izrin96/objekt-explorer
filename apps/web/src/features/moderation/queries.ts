import { orpc } from "@/lib/orpc";

export const queueOptions = () => orpc.moderation.queue.queryOptions({ staleTime: 0 });

export const accountOptions = (userId: string) =>
  orpc.moderation.account.queryOptions({ input: { userId }, staleTime: 0, retry: false });
