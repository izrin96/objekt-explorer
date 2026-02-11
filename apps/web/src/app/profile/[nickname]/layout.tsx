import type { PropsWithChildren } from "react";

import DynamicContainer from "@/components/dynamic-container";
import { PrivateProfileGuard, ProfileProvider } from "@/components/profile-provider";
import { ProfileBanner, ProfileBannerClearance } from "@/components/profile/profile-banner";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import { Container } from "@/components/ui/container";
import { getUserByIdentifier } from "@/lib/data-fetching";
import { getSession } from "@/lib/server/auth";

type Props = PropsWithChildren<{
  params: Promise<{
    nickname: string;
  }>;
}>;

export default async function UserCollectionLayout(props: Props) {
  const [params, session] = await Promise.all([props.params, getSession()]);
  const targetProfile = await getUserByIdentifier(params.nickname, session?.user.id);

  return (
    <ProfileProvider targetProfile={targetProfile}>
      <PrivateProfileGuard profile={targetProfile}>
        <ProfileBanner profile={targetProfile} />
        {targetProfile.bannerImgUrl && (
          <Container className="[--container-breakpoint:var(--breakpoint-2xl)]">
            <ProfileBannerClearance />
          </Container>
        )}
        <DynamicContainer>
          <div className="flex min-h-screen flex-col gap-4 pt-2 pb-36">
            <ProfileHeader user={targetProfile} />
            <ProfileTabs />
            {props.children}
          </div>
        </DynamicContainer>
      </PrivateProfileGuard>
    </ProfileProvider>
  );
}
