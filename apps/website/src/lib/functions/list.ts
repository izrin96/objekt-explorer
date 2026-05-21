import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { fetchList } from "../server/list.server";

export const listBySlugInputSchema = z.object({
  slug: z.string(),
  profileAddress: z.string().optional(),
});

export const getListBySlug = createServerFn({ method: "GET" })
  .inputValidator(listBySlugInputSchema)
  .handler(async ({ data }) => {
    const list = await fetchList(data.slug, data.profileAddress);
    if (!list) throw notFound();
    return list;
  });
