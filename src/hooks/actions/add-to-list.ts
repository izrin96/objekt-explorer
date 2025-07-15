import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";

export function useAddToList({ onSuccess }: { onSuccess?: () => void } = {}) {
  const queryClient = useQueryClient();
  const addToList = useMutation(
    orpc.list.addObjektsToList.mutationOptions({
      onSuccess: (rowCount, { slug }) => {
        onSuccess?.();
        queryClient.invalidateQueries({
          queryKey: orpc.list.listEntries.key({
            input: slug,
          }),
        });
        toast.success(`${rowCount} objekt added to the list`, {
          duration: 1300,
        });
      },
      onError: () => {
        toast.error("Error adding objekt to list");
      },
    }),
  );
  return addToList;
}
