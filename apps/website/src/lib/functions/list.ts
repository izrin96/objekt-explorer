import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { fetchList, sanitizePublicList } from "../server/list.server";
import { optionalAuth } from "../server/middleware";

export const listBySlugInputSchema = z.object({
  slug: z.string(),
  profileAddress: z.string().optional(),
});

export const getListBySlug = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .inputValidator(listBySlugInputSchema)
  .handler(async ({ data, context: { session } }) => {
    const list = await fetchList(data.slug, data.profileAddress);
    if (!list) throw notFound();

    const sanitized = sanitizePublicList(list, session?.user.id);
    return sanitized;
  });
