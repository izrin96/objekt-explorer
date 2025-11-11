import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";

export function useRemoveFromList() {
  const removeObjekts = useMutation(
    orpc.list.removeObjekts.mutationOptions({
      onSuccess: (_, { slug, ids }, _o, { client }) => {
        client.setQueryData(orpc.list.listEntries.queryKey({ input: { slug } }), (old = []) => {
          const idSet = new Set(ids.map(String));
          return old.filter((item) => idSet.has(item.id) === false);
        });

        toast.success("Objekt removed from the list");
      },
      onError: () => {
        toast.error("Error removing objekt from list");
      },
    }),
  );
  return removeObjekts;
}

export function useRemoveFromProfileList() {
  const removeObjekts = useMutation(
    orpc.profileList.removeObjekts.mutationOptions({
      onSuccess: (_, { slug, ids }, _o, { client }) => {
        client.setQueryData(
          orpc.profileList.listEntries.queryKey({ input: { slug } }),
          (old = []) => {
            const idSet = new Set(ids.map(String));
            return old.filter((item) => idSet.has(item.id) === false);
          },
        );

        toast.success("Objekt removed from the list");
      },
      onError: () => {
        toast.error("Error removing objekt from list");
      },
    }),
  );
  return removeObjekts;
}
