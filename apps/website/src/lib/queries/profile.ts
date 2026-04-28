import { queryOptions } from "@tanstack/react-query";
import type * as z from "zod";

import type { profileByNicknameSchema } from "../functions/profile";
import { getProfileByNickname } from "../functions/profile";

export const profileByNicknameQuery = (data: z.infer<typeof profileByNicknameSchema>) =>
  queryOptions({
    queryKey: ["profile", data.nickname],
    queryFn: () => getProfileByNickname({ data }),
  });
