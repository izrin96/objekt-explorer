import type { BannerCursor } from "@repo/api/schemas/admin";

import { LOADER_READ_STALE_MS, orpc } from "@/lib/orpc";

export const bannersOptions = () =>
  orpc.admin.banners.infiniteOptions({
    input: (cursor: BannerCursor | undefined) => ({ cursor }),
    initialPageParam: undefined as BannerCursor | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: LOADER_READ_STALE_MS,
    retry: false,
  });
