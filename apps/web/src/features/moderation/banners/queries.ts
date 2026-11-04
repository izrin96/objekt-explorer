import type { BannerCursor } from "@repo/api/schemas/admin";

import { orpc } from "@/lib/orpc";

export const bannersOptions = () =>
  orpc.admin.banners.infiniteOptions({
    input: (cursor: BannerCursor | undefined) => ({ cursor }),
    initialPageParam: undefined as BannerCursor | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 0,
    retry: false,
  });
