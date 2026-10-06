import type { TradeMatches } from "@repo/api/services/trade-matches";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
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
