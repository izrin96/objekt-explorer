import { ORPCError } from "@orpc/client";
import type { TradeMatches } from "@repo/api/services/trade-matches";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { LIST_QUERY_KEY } from "@/features/list/queries";
import { currentUserOptions } from "@/features/user/queries";
import { orpc } from "@/lib/orpc";
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
      onError: ({ message }) => {
        toastManager.add({ type: "error", title: m.trade_hide_error(), description: message });
      },
    }),
  );
}

export function useUnhidePartner() {
  const invalidate = useTradeInvalidation();

  return useMutation(
    orpc.trade.unhidePartner.mutationOptions({
      onSuccess: () => invalidate(),
      onError: ({ message }) => {
        toastManager.add({ type: "error", title: m.trade_unhide_error(), description: message });
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
            : { type: "error", title: m.trade_bump_error(), description: error.message },
        );
      },
      onSettled: () => invalidate(),
    }),
  );
}

/** a list on Trade is in the viewer's lists, its own page and both trade views */
export function useSetShowOnTrade() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.trade.setShowOnTrade.mutationOptions({
      onError: ({ message }) => {
        toastManager.add({
          type: "error",
          title: m.trade_show_on_trade_error(),
          description: message,
        });
      },
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: orpc.list.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.trade.key() }),
        ]),
    }),
  );
}
