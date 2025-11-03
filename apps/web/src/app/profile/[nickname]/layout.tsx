import { LockIcon } from "@phosphor-icons/react/dist/ssr";
import type { PropsWithChildren } from "react";
import DynamicContainer from "@/components/dynamic-container";
import { ProfileBanner, ProfileBannerClearance } from "@/components/profile/profile-banner";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import { Container } from "@/components/ui/container";
import { TargetProvider } from "@/hooks/use-target";
import { UserProvider } from "@/hooks/use-user";
import { getUserByIdentifier } from "@/lib/data-fetching";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { getSession } from "@/lib/server/auth";
import { fetchUserProfiles } from "@/lib/server/profile";

type Props = PropsWithChildren<{
  params: Promise<{
    nickname: string;
  }>;
}>;

export default async function UserCollectionLayout(props: Props) {
  const queryClient = getQueryClient();
  const [session, params] = await Promise.all([getSession(), props.params]);
  const [profile, profiles] = await Promise.all([
    getUserByIdentifier(params.nickname),
    session ? fetchUserProfiles(session.user.id) : undefined,
  ]);

  queryClient.prefetchQuery(orpc.filterData.queryOptions());

  const isOwned = profiles?.some((a) => a.address === profile.address) ?? false;

  if (profile.privateProfile && !isOwned)
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
        <LockIcon size={72} weight="thin" />
        Profile Private
      </div>
    );

  return (
    <UserProvider profiles={profiles}>
      <TargetProvider profile={profile}>
        <ProfileBanner />
        {profile.bannerImgUrl && (
          <Container>
            <ProfileBannerClearance />
          </Container>
        )}
        <DynamicContainer>
          <div className="flex min-h-screen flex-col gap-4 pt-2 pb-36">
            <ProfileHeader />
            <ProfileTabs />
            <HydrateClient client={queryClient}>{props.children}</HydrateClient>
          </div>
        </DynamicContainer>
      </TargetProvider>
    </UserProvider>
  );
}
