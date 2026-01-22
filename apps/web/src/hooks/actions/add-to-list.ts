import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

export function useAddToList() {
  const addToList = useMutation(
    orpc.list.addObjektsToList.mutationOptions({
      onSuccess: (rows, { slug }, _o, { client }) => {
        client.setQueryData(orpc.list.listEntries.queryKey({ input: { slug } }), (old) => {
          if (old === undefined) return;
          return [...rows, ...old];
        });

        toast.success(`${rows.length.toLocaleString()} objekt added to the list`);
      },
      onError: () => {
        toast.error("Error adding objekt to list");
      },
    }),
  );
  return addToList;
}
