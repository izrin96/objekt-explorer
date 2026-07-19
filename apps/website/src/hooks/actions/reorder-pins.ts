import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";
import { m } from "@/paraglide/messages";

import { applyPinOrderToCache } from "./pin-order-cache";

export function useReorderPins() {
  const reorderPins = useMutation(
    orpc.pins.reorderPins.mutationOptions({
      onMutate: async ({ tokenIds, address }, { client }) => {
        applyPinOrderToCache(client, address, tokenIds);

        await client.cancelQueries(orpc.pins.list.queryOptions({ input: address }));
      },
      onError: async (_err, { address }, _context, { client }) => {
        const queryKey = orpc.pins.list.queryKey({ input: address });

        await client.invalidateQueries({ queryKey });

        toast.error(m.actions_move_pin_error());
      },
    }),
  );
  return reorderPins;
}
