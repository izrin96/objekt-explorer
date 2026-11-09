import { createFileRoute } from "@tanstack/react-router";

import { filterSearchSchema } from "@/features/filters/search-schema";
import { objektSearchSchema } from "@/features/objekt/drawer/search-schema";
import { CollectionView } from "@/features/profile/collection-view";
import { loadProfile, profileTabHead } from "@/features/profile/tab-route";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/@{$nickname}/")({
  // a copy is linked by its token; the serial browsed stays off the URL here
  validateSearch: filterSearchSchema.extend(objektSearchSchema.omit({ serial: true }).shape),
  loader: loadProfile,
  head: profileTabHead(m.page_titles_profile_collection),
  // another profile starts fresh, so an open objekt drawer does not carry over to it
  remountDeps: ({ params }) => params.nickname,
  component: CollectionView,
});
