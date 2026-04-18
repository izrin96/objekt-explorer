import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

import { useObjektSelect } from "../use-objekt-select";

export function useUpdateEntryPrices() {
  const content = useIntlayer("list");
  const reset = useObjektSelect((a) => a.reset);

  const batchUpdatePrices = useMutation(
    orpc.list.updateEntryPrices.mutationOptions({
      onMutate: async ({ slug, updates }, { client }) => {
        await client.cancelQueries(orpc.list.listEntries.queryOptions({ input: { slug } }));

        const queryKey = orpc.list.listEntries.queryKey({ input: { slug } });
        const snapshot = client.getQueryData(queryKey);

        client.setQueryData(queryKey, (old = []) => {
          const updatesMap = new Map(updates.map((u) => [String(u.entryId), u]));
          return old.map((entry) => {
            const update = updatesMap.get(entry.id);
            if (!update) return entry;
            return {
              ...entry,
              price: update.price ?? undefined,
              isQyop: update.isQyop,
              note: update.note ?? undefined,
            };
          });
        });

        return { snapshot };
      },
      onSuccess: () => {
        toast.success(content.manage_objekt.set_price_success.value);
        reset();
      },
      onError: async (_err, { slug }, context, { client }) => {
        const queryKey = orpc.list.listEntries.queryKey({ input: { slug } });

        if (context?.snapshot) {
          client.setQueryData(queryKey, context.snapshot);
        } else {
          await client.invalidateQueries({ queryKey });
        }

        toast.error(content.manage_objekt.set_price_error.value);
      },
    }),
  );
  return batchUpdatePrices;
}
