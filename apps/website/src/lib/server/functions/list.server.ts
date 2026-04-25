import { notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { fetchUserByIdentifier } from "../auth.server";
import { fetchList, sanitizePublicList } from "../list.server";
import { optionalAuth } from "../middleware.server";

export const getListBySlug = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data, context: { session } }) => {
    const list = await fetchList(data.slug);
    if (!list) throw notFound();

    const sanitized = sanitizePublicList(list, session?.user.id);

    // Redirect profile-bound lists
    if (sanitized.profileAddress && (sanitized.profileSlug || sanitized.slug)) {
      const profile = await fetchUserByIdentifier(sanitized.profileAddress);
      throw redirect({
        to: "/@$nickname/list/$slug",
        params: {
          nickname: profile?.nickname || profile?.address || sanitized.profileAddress,
          slug: sanitized.profileSlug || sanitized.slug,
        },
      });
    }

    return sanitized;
  });
