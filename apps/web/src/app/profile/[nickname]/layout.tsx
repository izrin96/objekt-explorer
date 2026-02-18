import type { PropsWithChildren } from "react";

import { Suspense } from "react";

import type { PublicProfile } from "@/lib/universal/user";

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
  const result = await getUserByIdentifier(params.nickname);

  const { ownerId, ...targetProfile } = result;
  const safeProfile: PublicProfile = {
    ...targetProfile,
    isOwned: ownerId && session?.user.id ? ownerId === session.user.id : false,
  };

  return (
    <ProfileProvider targetProfile={safeProfile}>
      <PrivateProfileGuard profile={safeProfile}>
        <ProfileBanner profile={safeProfile} />
        {safeProfile.bannerImgUrl && (
          <Container className="[--container-breakpoint:var(--breakpoint-2xl)]">
            <ProfileBannerClearance />
          </Container>
        )}
        <DynamicContainer>
          <div className="flex min-h-screen flex-col gap-4 pt-2 pb-36">
            <ProfileHeader user={safeProfile} />
            <Suspense>
              <ProfileTabs />
            </Suspense>
            {props.children}
          </div>
        </DynamicContainer>
      </PrivateProfileGuard>
    </ProfileProvider>
  );
}
