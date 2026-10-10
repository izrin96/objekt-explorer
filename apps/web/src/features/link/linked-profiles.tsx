import { LinkIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { AccountSection } from "@/features/account/account-nav";
import { LinkedCard } from "@/features/link/linked-card";
import { useLinkedPreviews } from "@/features/link/use-linked-previews";
import { PreviewCardsSkeleton } from "@/features/objekt/objekt-preview-strip";
import { useUserProfiles } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

export function LinkedProfilesPanel() {
  const profiles = useUserProfiles();
  const getPreview = useLinkedPreviews(profiles.map((profile) => profile.address));

  return (
    <AccountSection
      title={m.account_section_profiles()}
      description={
        profiles.length === 0
          ? m.link_no_cosmo_linked()
          : m.link_profiles_linked({ count: String(profiles.length) })
      }
      aside={
        <Button size="sm" render={<Link to="/link/connect" />}>
          <LinkIcon />
          {m.link_link_cosmo()}
        </Button>
      }
    >
      {profiles.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {profiles.map((profile) => (
            <LinkedCard
              key={profile.address}
              profile={profile}
              preview={getPreview(profile.address)}
            />
          ))}
        </div>
      )}
    </AccountSection>
  );
}

export function LinkedProfilesPending() {
  return (
    <AccountSection title={m.account_section_profiles()}>
      <PreviewCardsSkeleton />
    </AccountSection>
  );
}
