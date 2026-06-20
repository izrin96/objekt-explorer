import { notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { fetchUserByIdentifierOrThrow } from "../server/auth.server";
import { fetchList } from "../server/list.server";

export const listBySlugInputSchema = z.object({
  slug: z.string(),
  nickname: z.string().optional(),
});

export const getListBySlug = createServerFn({ method: "GET" })
  .validator(listBySlugInputSchema)
  .handler(async ({ data }) => {
    const lookup = data.nickname
      ? {
          profileSlug: data.slug,
          profileAddress: await resolveAddress(data.nickname, data.slug),
        }
      : { slug: data.slug };
    const list = await fetchList(lookup);
    if (!list) throw notFound();
    return list;
  });

async function resolveAddress(nickname: string, slug: string) {
  const profile = await fetchUserByIdentifierOrThrow(nickname, undefined, (newNickname) =>
    redirect({
      to: "/@{$nickname}/list/$slug",
      params: { nickname: newNickname, slug },
    }),
  );
  return profile.address;
}
