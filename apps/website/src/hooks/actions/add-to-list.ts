import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "react-intlayer";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

import { useObjektSelect } from "../use-objekt-select";

export function useAddToList() {
  const content = useIntlayer("actions");
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
          rows.length > 1
            ? content.add_to_list.success_multiple({ count: rows.length.toLocaleString() }).value
            : content.add_to_list.success_single.value;
        toast.success(message);
        reset();
      },
      onError: () => {
        toast.error(content.add_to_list.error.value);
      },
    }),
  );
  return addToList;
}
