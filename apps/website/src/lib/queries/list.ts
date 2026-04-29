import { queryOptions } from "@tanstack/react-query";
import type * as z from "zod";

import type { listBySlugInputSchema } from "../functions/list";
import { getListBySlug } from "../functions/list";

export const listBySlugQuery = (data: z.infer<typeof listBySlugInputSchema>) =>
  queryOptions({
    queryKey: ["list", data.slug],
    queryFn: () => getListBySlug({ data }),
  });
