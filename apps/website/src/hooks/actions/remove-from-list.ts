import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";
import { m } from "@/paraglide/messages";

import { useObjektSelect } from "../use-objekt-select";

export function useRemoveFromList() {
  const reset = useObjektSelect((a) => a.reset);

  const removeObjektsFromList = useMutation(
    orpc.list.removeObjektsFromList.mutationOptions({
      onMutate: async ({ slug, ids }, { client }) => {
        await client.cancelQueries(orpc.list.listEntries.queryOptions({ input: { slug } }));

        const queryKey = orpc.list.listEntries.queryKey({ input: { slug } });
        const snapshot = client.getQueryData(queryKey);

        client.setQueryData(queryKey, (old = []) => {
          const idSet = new Set(ids.map(String));
          return old.filter((item) => !idSet.has(item.id));
        });

        return { snapshot };
      },
      onSuccess: (_, { ids }) => {
        const message =
          ids.length > 1
            ? m.actions_remove_from_list_success_multiple({ count: ids.length.toLocaleString() })
            : m.actions_remove_from_list_success_single();
        toast.success(message);
        reset();
      },
      onError: async (_err, { slug }, context, { client }) => {
        const queryKey = orpc.list.listEntries.queryKey({ input: { slug } });

        if (context?.snapshot) {
          client.setQueryData(queryKey, context.snapshot);
        } else {
          await client.invalidateQueries({ queryKey });
        }

        toast.error(m.actions_remove_from_list_error());
      },
    }),
  );
  return removeObjektsFromList;
}
