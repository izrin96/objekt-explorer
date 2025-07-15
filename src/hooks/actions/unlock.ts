import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";
import type { LockListOutput } from "@/lib/server/api/routers/locked-objekts";

export function useUnlock(address: string) {
  const queryClient = useQueryClient();
  const unlock = useMutation(
    orpc.lockedObjekt.unlock.mutationOptions({
      onMutate: async ({ tokenId }) => {
        await queryClient.cancelQueries({
          queryKey: orpc.lockedObjekt.list.key({ input: address }),
        });
        const previousLocks = queryClient.getQueryData<LockListOutput>(
          orpc.lockedObjekt.list.queryKey({ input: address }),
        );
        queryClient.setQueryData<LockListOutput>(
          orpc.lockedObjekt.list.queryKey({ input: address }),
          (old = []) => old.filter((item) => item.tokenId !== String(tokenId)),
        );
        return { previousLocks };
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.lockedObjekt.list.key({
            input: address,
          }),
        });
        toast.success("Objekt unlocked");
      },
      onError: (_err, _variables, context) => {
        if (context?.previousLocks) {
          queryClient.setQueryData(
            orpc.lockedObjekt.list.queryKey({ input: address }),
            context.previousLocks,
          );
        }
        toast.error("Error unlock objekt");
      },
    }),
  );
  return unlock;
}
