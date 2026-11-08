import type { StaffDays } from "@repo/api/schemas/staff-totals";

import { LOADER_READ_STALE_MS, orpc } from "@/lib/orpc";

// as the console's reads: a tab refetches on focus; totals are cached on the server
export const tradeTotalsOptions = (days: StaffDays) =>
  orpc.admin.tradeTotals.queryOptions({ input: { days }, staleTime: LOADER_READ_STALE_MS });

export const tradeAttentionOptions = (days: StaffDays) =>
  orpc.admin.tradeAttention.queryOptions({ input: { days }, staleTime: LOADER_READ_STALE_MS });

export const trackerHealthOptions = () =>
  orpc.admin.trackerHealth.queryOptions({ staleTime: LOADER_READ_STALE_MS });

export const staffTradeOptions = (tradeId: number) =>
  orpc.admin.staffTrade.queryOptions({
    input: { tradeId },
    staleTime: LOADER_READ_STALE_MS,
    retry: false,
  });

export const messageTotalsOptions = (days: StaffDays) =>
  orpc.admin.messageTotals.queryOptions({ input: { days }, staleTime: LOADER_READ_STALE_MS });
