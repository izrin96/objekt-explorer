import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

export function useUpdateEntryPrices() {
  const content = useIntlayer("list");

  return useMutation(
    orpc.list.updateEntryPrices.mutationOptions({
      onSuccess: (_, { slug }, _o, { client }) => {
        toast.success(content.manage_objekt.set_price_success.value);
        void client.invalidateQueries({
          queryKey: orpc.list.listEntries.key({ input: { slug } }),
        });
      },
      onError: () => {
        toast.error(content.manage_objekt.set_price_error.value);
      },
    }),
  );
}
