import { fetchList, isListMessageable } from "@repo/api/services/list";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { optionalAuth } from "../middleware";

export const listBySlugInputSchema = z.object({
  slug: z.string(),
  /** set for the profile-scoped address, where `slug` is the list's `profileSlug` */
  address: z.string().optional(),
});

export const getListBySlug = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .validator(listBySlugInputSchema)
  .handler(async ({ data, context: { session } }) => {
    const list = await fetchList(
      data.address !== undefined
        ? { profileSlug: data.slug, profileAddress: data.address }
        : { slug: data.slug },
    );
    if (!list) throw notFound();
    return { ...list, messageable: await isListMessageable(list.id, session?.user.id) };
  });
