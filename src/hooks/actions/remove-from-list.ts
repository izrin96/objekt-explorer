import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";
import type { ListEntriesOutput } from "@/lib/server/api/routers/list";

export function useRemoveFromList() {
  const queryClient = useQueryClient();
  const removeObjektsFromList = useMutation(
    orpc.list.removeObjektsFromList.mutationOptions({
      onMutate: async ({ slug, ids }) => {
        // await queryClient.cancelQueries({
        //   queryKey: orpc.list.listEntries.key({ input: slug }),
        // });
        const previousEntries = queryClient.getQueryData<ListEntriesOutput>(
          orpc.list.listEntries.queryKey({ input: { slug } }),
        );
        queryClient.setQueryData<ListEntriesOutput>(
          orpc.list.listEntries.queryKey({ input: { slug } }),
          (old = []) => {
            const idSet = new Set(ids.map(String));
            return old.filter((item) => idSet.has(item.id) === false);
          },
        );
        return { previousEntries };
      },
      onSuccess: () => {
        // queryClient.invalidateQueries({
        //   queryKey: orpc.list.listEntries.key({
        //     input: slug,
        //   }),
        // });
        toast.success("Objekt removed from the list");
      },
      onError: (_err, { slug }, context) => {
        if (context?.previousEntries) {
          queryClient.setQueryData(
            orpc.list.listEntries.queryKey({ input: { slug } }),
            context.previousEntries,
          );
        }
        toast.error("Error removing objekt from list");
      },
    }),
  );
  return removeObjektsFromList;
}
