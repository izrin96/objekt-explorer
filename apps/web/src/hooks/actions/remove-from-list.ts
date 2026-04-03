import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

export function useRemoveFromList() {
  const content = useIntlayer("actions");

  const removeObjektsFromList = useMutation(
    orpc.list.removeObjektsFromList.mutationOptions({
      onSuccess: (_, { slug, ids }, _o, { client }) => {
        client.setQueryData(orpc.list.listEntries.queryKey({ input: { slug } }), (old = []) => {
          const idSet = new Set(ids.map(String));
          return old.filter((item) => !idSet.has(item.id));
        });

        const message =
          ids.length > 1
            ? content.remove_from_list.success_multiple({ count: ids.length.toLocaleString() })
                .value
            : content.remove_from_list.success_single.value;
        toast.success(message);
      },
      onError: () => {
        toast.error(content.remove_from_list.error.value);
      },
    }),
  );
  return removeObjektsFromList;
}
