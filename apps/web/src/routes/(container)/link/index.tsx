import { LinkIcon } from "@phosphor-icons/react";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LinkedCard } from "@/features/link/linked-card";
import { linkedPreviewsOptions } from "@/features/link/queries";
import { useLinkedPreviews } from "@/features/link/use-linked-previews";
import { PreviewCardsSkeleton } from "@/features/objekt/objekt-preview-strip";
import { useUserProfiles } from "@/features/user/hooks";
import { currentUserOptions } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/link/")({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    if (!user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  loader: async ({ context: { queryClient } }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    // a failed preview read leaves the cards to fetch it again, not the page to fail
    await queryClient
      .query({
        ...linkedPreviewsOptions(user?.profiles.map((profile) => profile.address) ?? []),
        staleTime: "static",
      })
      .catch(() => undefined);
  },
  head: () => generateMetadata({ title: m.page_titles_my_cosmo_link() }),
  component: LinkPage,
  pendingComponent: LinkPending,
});

function LinkPage() {
  const profiles = useUserProfiles();
  const getPreview = useLinkedPreviews(profiles.map((profile) => profile.address));

  return (
    <>
      <PageHeader
        title={m.link_my_cosmo()}
        description={
          profiles.length === 0
            ? m.link_no_cosmo_linked()
            : m.link_profiles_linked({ count: String(profiles.length) })
        }
        aside={
          <Button render={<Link to="/link/connect" />}>
            <LinkIcon />
            {m.link_link_cosmo()}
          </Button>
        }
      />

      {profiles.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <LinkedCard
              key={profile.address}
              profile={profile}
              preview={getPreview(profile.address)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function LinkPending() {
  return (
    <>
      <PageHeader title={m.link_my_cosmo()} />
      <PreviewCardsSkeleton />
    </>
  );
}
