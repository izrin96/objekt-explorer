import type { PropsWithChildren } from "react";

import { LockIcon } from "@phosphor-icons/react/dist/ssr";

import DynamicContainer from "@/components/dynamic-container";
import { ProfileProvider } from "@/components/profile-provider";
import { ProfileBanner, ProfileBannerClearance } from "@/components/profile/profile-banner";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import { Container } from "@/components/ui/container";
import { getUserByIdentifier } from "@/lib/client-fetching";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { getSession, toPublicUser } from "@/lib/server/auth";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { fetchUserProfiles } from "@/lib/server/profile";

type Props = PropsWithChildren<{
  params: Promise<{
    nickname: string;
  }>;
}>;

export default async function UserCollectionLayout(props: Props) {
  const queryClient = getQueryClient();
  const [session, params] = await Promise.all([getSession(), props.params]);
  const [targetProfile, profiles] = await Promise.all([
    getUserByIdentifier(params.nickname),
    session ? fetchUserProfiles(session.user.id) : undefined,
  ]);

  queryClient.prefetchQuery({
    queryKey: ["filter-data"],
    queryFn: fetchFilterData,
  });

  const isOwned = profiles?.some((a) => a.address === targetProfile.address) ?? false;

  if (targetProfile.privateProfile && !isOwned)
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
        <LockIcon size={72} weight="thin" />
        Profile Private
      </div>
    );

  return (
    <ProfileProvider profiles={profiles} targetProfile={targetProfile} user={toPublicUser(session)}>
      <ProfileBanner profile={targetProfile} />
      {targetProfile.bannerImgUrl && (
        <Container>
          <ProfileBannerClearance />
        </Container>
      )}
      <DynamicContainer>
        <div className="flex min-h-screen flex-col gap-4 pt-2 pb-36">
          <ProfileHeader user={targetProfile} />
          <ProfileTabs />
          <HydrateClient client={queryClient}>{props.children}</HydrateClient>
        </div>
      </DynamicContainer>
    </ProfileProvider>
  );
}
