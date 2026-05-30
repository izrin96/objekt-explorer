import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";
import { m } from "@/paraglide/messages";

import { useObjektSelect } from "../use-objekt-select";

export function useAddToList() {
  const reset = useObjektSelect((a) => a.reset);

  const addToList = useMutation(
    orpc.list.addObjektsToList.mutationOptions({
      onSuccess: async (rows, { slug }, _o, { client }) => {
        await client.cancelQueries(orpc.list.listEntries.queryOptions({ input: { slug } }));

        const queryKey = orpc.list.listEntries.queryKey({ input: { slug } });
        const existing = client.getQueryData(queryKey);

        if (existing) {
          client.setQueryData(queryKey, (old = []) => [...rows, ...old]);
        } else {
          await client.invalidateQueries({ queryKey });
        }

        const message =
          rows.length === 1
            ? m.actions_add_to_list_success_single({ collectionId: rows[0]!.collectionId })
            : rows.length > 1
              ? m.actions_add_to_list_success_multiple({ count: rows.length.toLocaleString() })
              : null;
        if (message) {
          toast.success(message);
        }
        reset();
      },
      onError: () => {
        toast.error(m.actions_add_to_list_error());
      },
    }),
  );
  return addToList;
}
