import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";
import { m } from "@/paraglide/messages";

export function useUpdateEntryPrices() {
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
        toast.success(m.list_manage_objekt_set_price_success());
      },
      onError: async (_err, { slug }, context, { client }) => {
        const queryKey = orpc.list.listEntries.queryKey({ input: { slug } });

        if (context?.snapshot) {
          client.setQueryData(queryKey, context.snapshot);
        } else {
          await client.invalidateQueries({ queryKey });
        }

        toast.error(m.list_manage_objekt_set_price_error());
      },
    }),
  );
  return batchUpdatePrices;
}
