import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

export function useAddToList() {
  const content = useIntlayer("actions");

  const addToList = useMutation(
    orpc.list.addObjektsToList.mutationOptions({
      onSuccess: (rows, { slug }, _o, { client }) => {
        client.setQueryData(orpc.list.listEntries.queryKey({ input: { slug } }), (old) => {
          if (old === undefined) return [];
          return [...rows, ...old];
        });

        const message =
          rows.length > 1
            ? content.add_to_list.success_multiple({ count: rows.length.toLocaleString() }).value
            : content.add_to_list.success_single.value;
        toast.success(message);
      },
      onError: () => {
        toast.error(content.add_to_list.error.value);
      },
    }),
  );
  return addToList;
}
