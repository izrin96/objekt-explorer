import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";

export function useAddToList() {
  const queryClient = useQueryClient();
  const addToList = useMutation(
    orpc.list.addObjektsToList.mutationOptions({
      onSuccess: (rows, { slug }) => {
        // queryClient.invalidateQueries({
        //   queryKey: orpc.list.listEntries.key({
        //     input: {
        //       slug,
        //     },
        //   }),
        // });

        queryClient.setQueryData(
          orpc.list.listEntries.queryKey({ input: { slug } }),
          (old = []) => {
            return [...rows, ...old];
          },
        );

        toast.success(`${rows.length} objekt added to the list`, {
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
