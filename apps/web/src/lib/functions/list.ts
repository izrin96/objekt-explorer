import { fetchList } from "@repo/api/services/list";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

export const listBySlugInputSchema = z.object({
  slug: z.string(),
  /** set for the profile-scoped address, where `slug` is the list's `profileSlug` */
  address: z.string().optional(),
});

export const getListBySlug = createServerFn({ method: "GET" })
  .validator(listBySlugInputSchema)
  .handler(async ({ data }) => {
    const list = await fetchList(
      data.address !== undefined
        ? { profileSlug: data.slug, profileAddress: data.address }
        : { slug: data.slug },
    );
    if (!list) throw notFound();
    return list;
  });
