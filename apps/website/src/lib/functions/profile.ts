import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { fetchUserByIdentifier } from "../server/auth.server";
import { optionalAuth } from "../server/middleware";

export const profileInputSchema = z.object({ nickname: z.string() });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .validator(profileInputSchema)
  .handler(async ({ data, context: { session } }) => {
    const profile = await fetchUserByIdentifier(data.nickname, session?.user);
    if (!profile) throw notFound();
    return profile;
  });
