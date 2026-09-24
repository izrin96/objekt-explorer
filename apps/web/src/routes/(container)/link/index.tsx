import { LinkIcon } from "@phosphor-icons/react";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LinkedCard } from "@/features/link/linked-card";
import { useUserProfiles } from "@/features/user/hooks";
import { currentUserOptions } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/link/")({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    if (!user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  head: () => generateMetadata({ title: m.page_titles_my_cosmo_link() }),
  component: LinkPage,
});

function LinkPage() {
  const profiles = useUserProfiles();

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
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <LinkedCard key={profile.address} profile={profile} />
          ))}
        </div>
      )}
    </>
  );
}
