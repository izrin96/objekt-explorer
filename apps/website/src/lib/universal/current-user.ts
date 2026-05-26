import * as z from "zod";

import type { User } from "../server/auth.server";
import { publicListSchema } from "./list";
import { baseProfileSchema } from "./user";

export const currentUserSchema = z
  .object({
    user: z.custom<User>(),
    lists: publicListSchema.array(),
    profiles: baseProfileSchema.array(),
  })
  .nullable();
export type CurrentUser = z.infer<typeof currentUserSchema>;
