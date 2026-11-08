import type { StaffDays } from "@repo/api/schemas/staff-totals";

import { orpc } from "@/lib/orpc";

// 10s as the console's reads: long enough that the page does not refetch what its loader just read,
// short enough that a tab refetches on focus; totals are cached on the server
export const tradeTotalsOptions = (days: StaffDays) =>
  orpc.admin.tradeTotals.queryOptions({ input: { days }, staleTime: 10_000 });

export const tradeAttentionOptions = (days: StaffDays) =>
  orpc.admin.tradeAttention.queryOptions({ input: { days }, staleTime: 10_000 });

export const trackerHealthOptions = () =>
  orpc.admin.trackerHealth.queryOptions({ staleTime: 10_000 });

export const staffTradeOptions = (tradeId: number) =>
  orpc.admin.staffTrade.queryOptions({ input: { tradeId }, staleTime: 10_000, retry: false });

export const messageTotalsOptions = (days: StaffDays) =>
  orpc.admin.messageTotals.queryOptions({ input: { days }, staleTime: 10_000 });
