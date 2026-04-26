import { notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { fetchUserByIdentifier } from "../server/auth.server";
import { fetchList, sanitizePublicList } from "../server/list.server";
import { optionalAuth } from "../server/middleware";

export const getListBySlug = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .inputValidator(
    z.object({
      slug: z.string(),
      profileAddress: z.string().optional(),
      redirect: z.boolean().default(false),
    }),
  )
  .handler(async ({ data, context: { session } }) => {
    const list = await fetchList(data.slug, data.profileAddress);
    if (!list) throw notFound();

    // Redirect profile-bound lists
    if (list.profileAddress && list.profileSlug && data.redirect) {
      const profile = await fetchUserByIdentifier(list.profileAddress);
      if (!profile) throw notFound();
      throw redirect({
        to: "/@{$nickname}/list/$slug",
        params: {
          nickname: profile.nickname || profile.address,
          slug: list.profileSlug,
        },
      });
    }

    const sanitized = sanitizePublicList(list, session?.user.id);
    return sanitized;
  });
