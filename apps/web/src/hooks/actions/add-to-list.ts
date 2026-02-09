import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

export function useAddToList() {
  const t = useTranslations("actions.add_to_list");

  const addToList = useMutation(
    orpc.list.addObjektsToList.mutationOptions({
      onSuccess: (rows, { slug }, _o, { client }) => {
        client.setQueryData(orpc.list.listEntries.queryKey({ input: { slug } }), (old) => {
          if (old === undefined) return;
          return [...rows, ...old];
        });

        const key = rows.length > 1 ? "success_multiple" : "success_single";
        toast.success(t(key, { count: rows.length.toLocaleString() }));
      },
      onError: () => {
        toast.error(t("error"));
      },
    }),
  );
  return addToList;
}
