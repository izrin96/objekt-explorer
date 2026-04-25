import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { fetchUserByIdentifier } from "../auth.server";
import { optionalAuth } from "../middleware.server";
import { sanitizePublicProfile } from "../profile.server";

export const getProfileByNickname = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .inputValidator(z.object({ nickname: z.string() }))
  .handler(async ({ data, context: { session } }) => {
    const profile = await fetchUserByIdentifier(data.nickname);
    if (!profile) throw notFound();
    return sanitizePublicProfile(profile, session?.user.id);
  });
