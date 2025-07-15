import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";
import type { PinListOutput } from "@/lib/server/api/routers/pins";

export function usePin(address: string) {
  const queryClient = useQueryClient();
  const pin = useMutation(
    orpc.pins.pin.mutationOptions({
      onMutate: async ({ tokenId }) => {
        await queryClient.cancelQueries({
          queryKey: orpc.pins.list.key({ input: address }),
        });
        const previousPins = queryClient.getQueryData<PinListOutput>(
          orpc.pins.list.queryKey({ input: address }),
        );
        queryClient.setQueryData<PinListOutput>(
          orpc.pins.list.queryKey({ input: address }),
          (old = []) => [
            { tokenId: String(tokenId), order: Date.now() },
            ...old.filter((item) => item.tokenId !== String(tokenId)),
          ],
        );
        return { previousPins };
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.pins.list.key({
            input: address,
          }),
        });
        toast.success("Objekt pinned");
      },
      onError: (_err, _variables, context) => {
        if (context?.previousPins) {
          queryClient.setQueryData(
            orpc.pins.list.queryKey({ input: address }),
            context.previousPins,
          );
        }
        toast.error("Error pin objekt");
      },
    }),
  );
  return pin;
}
