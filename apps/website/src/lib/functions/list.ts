import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { fetchList } from "../server/list.server";

export const listBySlugInputSchema = z.object({
  slug: z.string(),
  address: z.string().optional(),
});

export const getListBySlug = createServerFn({ method: "GET" })
  .validator(listBySlugInputSchema)
  .handler(async ({ data }) => {
    const lookup = data.address
      ? {
          profileSlug: data.slug,
          profileAddress: data.address,
        }
      : { slug: data.slug };
    const list = await fetchList(lookup);
    if (!list) throw notFound();
    return list;
  });
