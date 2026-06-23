import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";
import { m } from "@/paraglide/messages";

export function useRemoveFromList() {
  const removeObjektsFromList = useMutation(
    orpc.list.removeObjektsFromList.mutationOptions({
      onMutate: async ({ slug, entryIds }, { client }) => {
        await client.cancelQueries(orpc.list.listEntries.queryOptions({ input: { slug } }));

        const queryKey = orpc.list.listEntries.queryKey({ input: { slug } });
        const snapshot = client.getQueryData(queryKey);

        const idSet = new Set(entryIds.map(String));
        const removed = snapshot?.filter((item) => idSet.has(item.id)) ?? [];

        client.setQueryData(queryKey, (old = []) => {
          return old.filter((item) => !idSet.has(item.id));
        });

        return { snapshot, removed };
      },
      onSuccess: (_, { entryIds }, context) => {
        const message =
          entryIds.length === 1 && context?.removed?.[0]
            ? m.actions_remove_from_list_success_single({
                collectionId: context.removed[0].collectionId,
              })
            : entryIds.length > 1
              ? m.actions_remove_from_list_success_multiple({
                  count: entryIds.length.toLocaleString(),
                })
              : null;
        if (message) {
          toast.success(message);
        }
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
