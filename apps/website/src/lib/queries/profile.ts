import { queryOptions } from "@tanstack/react-query";
import type * as z from "zod";

import type { profileInputSchema } from "../functions/profile";
import { getProfile } from "../functions/profile";

export const profileQuery = (data: z.infer<typeof profileInputSchema>) =>
  queryOptions({
    queryKey: ["profile", data.nickname],
    queryFn: () => getProfile({ data }),
  });
