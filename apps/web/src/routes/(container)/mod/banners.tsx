import { createFileRoute, notFound } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { BannerFeed, BannerFeedSkeleton } from "@/features/moderation/banners/banner-feed";
import { bannersOptions } from "@/features/moderation/banners/queries";
import { canOpenTab } from "@/features/moderation/staff-tabs";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/mod/banners")({
  beforeLoad: ({ context: { viewerRole } }) => {
    if (!canOpenTab("banners", viewerRole)) throw notFound();
  },
  loader: async ({ context: { queryClient } }) => {
    await queryClient.infiniteQuery({ ...bannersOptions(), staleTime: "static" });
  },
  head: () => generateMetadata({ title: m.mod_banners_title() }),
  component: BannersPage,
  pendingComponent: BannersPending,
});

function BannersPage() {
  return (
    <>
      <PageHeader title={m.mod_banners_title()} description={m.mod_banners_description()} />
      <BannerFeed />
    </>
  );
}

function BannersPending() {
  return (
    <>
      <PageHeader title={m.mod_banners_title()} description={m.mod_banners_description()} />
      <BannerFeedSkeleton />
    </>
  );
}
