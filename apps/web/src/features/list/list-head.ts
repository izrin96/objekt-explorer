import type { QueryClient } from "@tanstack/react-query";

import type { CompareSearch } from "@/features/compare/search-schema";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

import { listEntriesPreload } from "./queries";

/** The `head` of both list-detail routes: the title, and the entries' preload link. */
export function listDetailHead({
  loaderData,
  match,
}: {
  loaderData?: { list: Parameters<typeof m.page_titles_list_detail>[0] & { slug: string } };
  match: { context: { queryClient: QueryClient }; search: CompareSearch };
}) {
  if (!loaderData) return {};
  const { meta, links } = generateMetadata({ title: m.page_titles_list_detail(loaderData.list) });
  return {
    meta,
    links: [
      ...links,
      ...listEntriesPreload(match.context.queryClient, loaderData.list.slug, match.search),
    ],
  };
}
