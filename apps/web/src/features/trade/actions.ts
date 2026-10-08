import { ORPCError } from "@orpc/client";
import type { TradeMatches } from "@repo/api/services/trade-matches/index";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { LIST_QUERY_KEY } from "@/features/list/queries";
import { currentUserOptions } from "@/features/user/queries";
import { orpc } from "@/lib/orpc";
import { errorReason } from "@/lib/orpc-error";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";

function useTradeInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: orpc.trade.key() });
}

export function useHidePartner() {
  const queryClient = useQueryClient();
  const invalidate = useTradeInvalidation();

  return useMutation(
    orpc.trade.hidePartner.mutationOptions({
      onMutate: async ({ userId }) => {
        const key = orpc.trade.forYou.key();
        await queryClient.cancelQueries({ queryKey: key });
        queryClient.setQueriesData<TradeMatches>({ queryKey: key }, (data) =>
          data
            ? {
                ...data,
                partners: data.partners.filter((partner) => partner.userId !== userId),
                notShown: { ...data.notShown, hidden: data.notShown.hidden + 1 },
              }
            : data,
        );
      },
      onSettled: () => invalidate(),
      onError: () => {
        toastManager.add({ type: "error", title: m.trade_hide_error() });
      },
    }),
  );
}

export function useUnhidePartner() {
  const invalidate = useTradeInvalidation();

  return useMutation(
    orpc.trade.unhidePartner.mutationOptions({
      onSuccess: () => invalidate(),
      onError: () => {
        toastManager.add({ type: "error", title: m.trade_unhide_error() });
      },
    }),
  );
}

function nextBumpOf(error: unknown) {
  if (!(error instanceof ORPCError) || error.code !== "TOO_MANY_REQUESTS") return undefined;
  const next = (error.data as { nextBumpAt?: unknown } | undefined)?.nextBumpAt;
  return typeof next === "string" ? next : undefined;
}

/** outside the hook: the compiler reads `Date.now` in a hook body as a render-time call */
function bumpTooSoon(next: string) {
  return m.trade_bump_too_soon({
    time: relativeTime(new Date(next).getTime(), Date.now(), "hour"),
  });
}

export function useBumpPost() {
  const invalidate = useTradeInvalidation();

  return useMutation(
    orpc.trade.bump.mutationOptions({
      onSuccess: () => toastManager.add({ type: "success", title: m.trade_bump_success() }),
      onError: (error) => {
        const next = nextBumpOf(error);
        toastManager.add(
          next
            ? { type: "error", title: bumpTooSoon(next) }
            : { type: "error", title: m.trade_bump_error() },
        );
      },
      onSettled: () => invalidate(),
    }),
  );
}

function showOnTradeErrorText(error: unknown) {
  const { reason } = errorReason(error);
  if (reason === "needs_profile") return m.trade_post_needs_profile();
  if (reason === "not_tradeable") return m.trade_show_on_trade_not_tradeable();
  return m.trade_show_on_trade_error();
}

/** a list on Trade is in the viewer's lists, its own page, both trade views and, if for sale, Market */
export function useSetShowOnTrade() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.trade.setShowOnTrade.mutationOptions({
      onError: (error) => {
        toastManager.add({ type: "error", title: showOnTradeErrorText(error) });
      },
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: orpc.list.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.trade.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.market.key() }),
        ]),
    }),
  );
}
