import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { fetchUserByIdentifier } from "../server/auth.server";
import { fetchList } from "../server/list.server";

export const listBySlugInputSchema = z.object({
  slug: z.string(),
  nickname: z.string().optional(),
});

export const getListBySlug = createServerFn({ method: "GET" })
  .inputValidator(listBySlugInputSchema)
  .handler(async ({ data }) => {
    const lookup = data.nickname
      ? { profileSlug: data.slug, profileAddress: (await resolveAddress(data.nickname))! }
      : { slug: data.slug };
    const list = await fetchList(lookup);
    if (!list) throw notFound();
    return list;
  });

async function resolveAddress(nickname: string): Promise<string | undefined> {
  const profile = await fetchUserByIdentifier(nickname);
  if (!profile) throw notFound();
  return profile.address;
}
