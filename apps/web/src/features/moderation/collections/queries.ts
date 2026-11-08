import { orpc } from "@/lib/orpc";

export const collectionOverridesOptions = () =>
  orpc.admin.collectionOverrides.queryOptions({ staleTime: 10_000, retry: false });
