import type { StaffDays } from "@repo/api/schemas/staff-totals";

import { orpc } from "@/lib/orpc";

// staleTime 0 as the console's reads: a tab refetches on focus; totals are cached on the server
export const tradeTotalsOptions = (days: StaffDays) =>
  orpc.admin.tradeTotals.queryOptions({ input: { days }, staleTime: 0 });

export const tradeAttentionOptions = (days: StaffDays) =>
  orpc.admin.tradeAttention.queryOptions({ input: { days }, staleTime: 0 });

export const trackerHealthOptions = () => orpc.admin.trackerHealth.queryOptions({ staleTime: 0 });

export const staffTradeOptions = (tradeId: number) =>
  orpc.admin.staffTrade.queryOptions({ input: { tradeId }, staleTime: 0, retry: false });

export const messageTotalsOptions = (days: StaffDays) =>
  orpc.admin.messageTotals.queryOptions({ input: { days }, staleTime: 0 });
