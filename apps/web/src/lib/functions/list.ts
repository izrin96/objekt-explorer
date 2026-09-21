import { fetchUserByIdentifier, getSession } from "@repo/api/services/auth";
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

/** Stands in for the profile slice's own query until C5's lands; see the change's design note. */
export const getListProfile = createServerFn({ method: "GET" })
  .validator(z.object({ nickname: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSession();
    const profile = await fetchUserByIdentifier(data.nickname, session?.user);
    if (!profile) throw notFound();
    return profile;
  });
