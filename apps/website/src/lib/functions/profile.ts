import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { fetchUserByIdentifierOrThrow } from "../server/auth.server";
import { optionalAuth } from "../server/middleware";

export const profileInputSchema = z.object({ nickname: z.string() });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .validator(profileInputSchema)
  .handler(async ({ data, context: { session } }) => {
    return fetchUserByIdentifierOrThrow(data.nickname, session?.user, (newNickname) =>
      redirect({
        to: "/@{$nickname}",
        params: { nickname: newNickname },
      }),
    );
  });
