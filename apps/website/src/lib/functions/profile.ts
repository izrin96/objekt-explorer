import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { fetchUserByIdentifier } from "../server/auth.server";
import { optionalAuth } from "../server/middleware";
import { sanitizePublicProfile } from "../server/profile.server";

export const profileInputSchema = z.object({ nickname: z.string() });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .inputValidator(profileInputSchema)
  .handler(async ({ data, context: { session } }) => {
    const profile = await fetchUserByIdentifier(data.nickname);
    if (!profile) throw notFound();
    return sanitizePublicProfile(profile, session?.user.id);
  });
