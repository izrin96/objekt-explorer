import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

export function useUpdateEntryPrices() {
  const t = useTranslations("list.manage_objekt");

  return useMutation(
    orpc.list.updateEntryPrices.mutationOptions({
      onSuccess: (_, { slug }, _o, { client }) => {
        toast.success(t("set_price_success"));
        void client.invalidateQueries({
          queryKey: orpc.list.listEntries.key({ input: { slug } }),
        });
      },
      onError: () => {
        toast.error(t("set_price_error"));
      },
    }),
  );
}
