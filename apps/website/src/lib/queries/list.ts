import { queryOptions } from "@tanstack/react-query";
import type * as z from "zod";

import type { listBySlugInputSchema } from "../functions/list";
import { getListBySlug } from "../functions/list";
import { orpc } from "../orpc/client";

export const listBySlugQuery = (data: z.infer<typeof listBySlugInputSchema>) =>
  queryOptions({
    queryKey: ["list", data],
    queryFn: () => getListBySlug({ data }),
    staleTime: 0,
  });

export const tradePartnersQuery = (slug: string) =>
  orpc.list.findTradePartners.queryOptions({
    input: { slug },
    staleTime: 1000 * 60, // 1 minute
  });
