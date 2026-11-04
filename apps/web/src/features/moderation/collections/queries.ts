import { orpc } from "@/lib/orpc";

export const collectionOverridesOptions = () =>
  orpc.admin.collectionOverrides.queryOptions({ staleTime: 0, retry: false });
