import { noop, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { compareSearchSchema, isComparing } from "@/features/compare/search-schema";
import { filterSearchSchema } from "@/features/filters/search-schema";
import { ListHeader, ListPageSkeleton } from "@/features/list/list-header";
import { ListNotFound } from "@/features/list/list-not-found";
import { ListProvider } from "@/features/list/list-provider";
import { ListView } from "@/features/list/list-view";
import { listEntriesPreload, listBySlugQuery, listEntriesOptions } from "@/features/list/queries";
import { listRulesOptions } from "@/features/list/rules/queries";
import { nicknameParam } from "@/lib/address";
import { generateMetadata } from "@/lib/meta";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/list/$slug")({
  validateSearch: filterSearchSchema.extend(compareSearchSchema.shape),
  loaderDeps: ({ search }) => ({ comparing: isComparing(search) }),
  // a loader, not `beforeLoad`, which reruns on every filter change
  loader: async ({ params, deps, cause, context: { queryClient } }) => {
    // the entries take the slug, not the list, so they start beside it instead of after the render.
    // Never on the server, which would stream every entry into the HTML (11 MB for a 12k list),
    // nor on a hover preload, which would download them for a link only pointed at
    if (!import.meta.env.SSR && cause !== "preload" && !deps.comparing) {
      void queryClient
        .query({ ...orpc.config.getSelectedArtists.queryOptions(), staleTime: "static" })
        .then((artists) =>
          queryClient.query({ ...listEntriesOptions(params.slug, artists), staleTime: "static" }),
        )
        .catch(noop);
    }

    const list = await queryClient.query({
      ...listBySlugQuery({ slug: params.slug }),
      staleTime: "static",
    });

    // a list filed under a Cosmo lives at the profile-scoped address
    if (list.profileAddress && list.profileSlug) {
      if (!list.profile) throw notFound();
      throw redirect({
        to: "/@{$nickname}/list/$slug",
        params: {
          nickname: nicknameParam(list.profile.address, list.profile.nickname),
          slug: list.profileSlug,
        },
      });
    }

    if (list.listType === "want") {
      void queryClient.query(listRulesOptions(params.slug)).catch(noop);
    }

    return { list };
  },
  head: ({ loaderData, match }) => {
    if (!loaderData) return {};
    const { meta, links } = generateMetadata({ title: m.page_titles_list_detail(loaderData.list) });
    return {
      meta,
      links: [
        ...links,
        ...listEntriesPreload(match.context.queryClient, loaderData.list.slug, match.search),
      ],
    };
  },
  component: ListDetailPage,
  notFoundComponent: ListNotFound,
  pendingComponent: ListPageSkeleton,
});

function ListDetailPage() {
  const { slug } = Route.useParams();
  const { data: list } = useSuspenseQuery(listBySlugQuery({ slug }));

  return (
    <ListProvider list={list}>
      <ListHeader />
      {/* remounted per list, so the drawer and the selection never leak across slugs */}
      <ListView key={list.slug} />
    </ListProvider>
  );
}
