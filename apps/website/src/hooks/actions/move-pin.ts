import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";
import { m } from "@/paraglide/messages";

export function useMovePin() {
  const movePin = useMutation(
    orpc.pins.movePin.mutationOptions({
      onMutate: async ({ tokenId, direction, address }, { client }) => {
        await client.cancelQueries(orpc.pins.list.queryOptions({ input: address }));

        const queryKey = orpc.pins.list.queryKey({ input: address });
        const snapshot = client.getQueryData(queryKey);

        client.setQueryData(queryKey, (old = []) => {
          const sorted = old.toSorted((a, b) => a.order - b.order);
          const idx = sorted.findIndex((p) => p.tokenId === String(tokenId));
          if (idx === -1) return old;

          const swapIdx = direction === "down" ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= sorted.length) return old;

          // Assign brand-new order values derived purely from each item's
          // target position (rank) in `sorted`, not the old captured order
          // values. `sorted` is ascending (index 0 = bottom-most), so index i
          // maps to order value i + 1 (bigger = topmost) — mirrors the
          // server's movePin fix and applyPinOrderToCache, so a tie between
          // these two rows cannot survive the swap.
          return sorted.map((item, i) => {
            if (i === idx) return Object.assign({}, item, { order: swapIdx + 1 });
            if (i === swapIdx) return Object.assign({}, item, { order: idx + 1 });
            return item;
          });
        });

        return { snapshot };
      },
      onSuccess: () => {
        toast.success(m.actions_move_pin_success());
      },
      onError: async (_err, { address }, context, { client }) => {
        const queryKey = orpc.pins.list.queryKey({ input: address });

        if (context?.snapshot) {
          client.setQueryData(queryKey, context.snapshot);
        } else {
          await client.invalidateQueries({ queryKey });
        }

        toast.error(m.actions_move_pin_error());
      },
    }),
  );
  return movePin;
}
