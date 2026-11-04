import { createFileRoute, notFound } from "@tanstack/react-router";

import {
  CollectionsSkeleton,
  CollectionsView,
} from "@/features/moderation/collections/collections-view";
import { collectionOverridesOptions } from "@/features/moderation/collections/queries";
import { canOpenTab } from "@/features/moderation/staff-tabs";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/mod/collections")({
  beforeLoad: ({ context: { viewerRole } }) => {
    if (!canOpenTab("collections", viewerRole)) throw notFound();
  },
  // the collection list is a plain GET the browser revalidates, so the page reads it client-side
  loader: async ({ context: { queryClient } }) => {
    await queryClient.query({ ...collectionOverridesOptions(), staleTime: "static" });
  },
  head: () => generateMetadata({ title: m.mod_collections_title() }),
  component: CollectionsView,
  pendingComponent: CollectionsSkeleton,
});
