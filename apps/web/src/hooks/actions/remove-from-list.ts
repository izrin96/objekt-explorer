import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

export function useRemoveFromList() {
  const t = useTranslations("actions.remove_from_list");

  const removeObjektsFromList = useMutation(
    orpc.list.removeObjektsFromList.mutationOptions({
      onSuccess: (_, { slug, ids }, _o, { client }) => {
        client.setQueryData(orpc.list.listEntries.queryKey({ input: { slug } }), (old = []) => {
          const idSet = new Set(ids.map(String));
          return old.filter((item) => !idSet.has(item.id));
        });

        const key = ids.length > 1 ? "success_multiple" : "success_single";
        toast.success(t(key, { count: ids.length.toLocaleString() }));
      },
      onError: () => {
        toast.error(t("error"));
      },
    }),
  );
  return removeObjektsFromList;
}
