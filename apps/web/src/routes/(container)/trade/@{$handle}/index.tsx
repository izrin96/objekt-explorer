import { createFileRoute } from "@tanstack/react-router";

import { loadPersonRow } from "@/features/trade/browse-loader";
import { personPageHead } from "@/features/trade/person-page-head";
import { PersonPageRefused, PersonPageView } from "@/features/trade/person-page-view";
import { sharePreview } from "@/features/trade/share-preview";

export const Route = createFileRoute("/(container)/trade/@{$handle}/")({
  loader: async ({ context: { queryClient, person } }) => {
    if (!person) return { url: "", preview: null };
    const loaded = await loadPersonRow({ queryClient, userId: person.userId });
    return {
      url: `/trade/@${encodeURIComponent(person.handle)}`,
      // only the strings `head` needs: the row itself is in the query cache already
      preview: loaded?.row
        ? sharePreview({ handle: person.handle, posts: loaded.row.posts })
        : null,
    };
  },
  head: ({ loaderData }) => personPageHead(loaderData),
  component: PersonPage,
});

function PersonPage() {
  const { person } = Route.useRouteContext();
  if (!person) return <PersonPageRefused />;
  return <PersonPageView userId={person.userId} handle={person.handle} />;
}
