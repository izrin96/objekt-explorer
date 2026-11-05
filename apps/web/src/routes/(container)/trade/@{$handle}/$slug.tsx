import { createFileRoute, redirect } from "@tanstack/react-router";

import { loadPersonRow } from "@/features/trade/browse-loader";
import { slugTarget } from "@/features/trade/person-page";
import { personPageHead } from "@/features/trade/person-page-head";
import { PersonPageRefused, PersonPageView } from "@/features/trade/person-page-view";
import { sharePreview } from "@/features/trade/share-preview";

export const Route = createFileRoute("/(container)/trade/@{$handle}/$slug")({
  loader: async ({ context: { queryClient, person }, params }) => {
    if (!person) return { url: "", preview: null };
    const loaded = await loadPersonRow({ queryClient, userId: person.userId });
    const row = loaded?.row;
    const target = row ? slugTarget(row.posts, params.slug) : undefined;
    // the other list of a pair is the same post, under its anchor's address
    if (target?.kind === "anchor") {
      throw redirect({
        to: "/trade/@{$handle}/$slug",
        params: { handle: person.handle, slug: target.slug },
        replace: true,
      });
    }
    return {
      url: `/trade/@${encodeURIComponent(person.handle)}/${encodeURIComponent(params.slug)}`,
      // a post that is gone previews as plain Trade, though the page still shows the person
      preview:
        row && target?.kind === "post"
          ? sharePreview({ handle: person.handle, posts: row.posts }, target.post)
          : null,
    };
  },
  head: ({ loaderData }) => personPageHead(loaderData),
  component: PostPage,
});

function PostPage() {
  const { person, refusal } = Route.useRouteContext();
  const { slug } = Route.useParams();
  if (!person) return <PersonPageRefused refusal={refusal} />;
  return <PersonPageView userId={person.userId} handle={person.handle} slug={slug} />;
}
