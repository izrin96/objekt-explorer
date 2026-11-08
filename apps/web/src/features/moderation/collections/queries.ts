import { LOADER_READ_STALE_MS, orpc } from "@/lib/orpc";

export const collectionOverridesOptions = () =>
  orpc.admin.collectionOverrides.queryOptions({ staleTime: LOADER_READ_STALE_MS, retry: false });
