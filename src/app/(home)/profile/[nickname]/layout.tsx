import { LockIcon } from "@phosphor-icons/react/dist/ssr";
import type { PropsWithChildren } from "react";
import { ProfileBanner, ProfileBannerClearance } from "@/components/profile/profile-banner";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import { ProfileProvider } from "@/components/profile-provider";
import { Container } from "@/components/ui";
import { getUserByIdentifier } from "@/lib/client-fetching";
import { cachedSession, toPublicUser } from "@/lib/server/auth";
import { fetchUserProfiles } from "@/lib/server/profile";

type Props = PropsWithChildren<{
  params: Promise<{
    nickname: string;
  }>;
}>;

export default async function UserCollectionLayout(props: Props) {
  const params = await props.params;

  const session = await cachedSession();

  const [targetUser, profiles] = await Promise.all([
    getUserByIdentifier(params.nickname),
    session ? fetchUserProfiles(session.user.id) : undefined,
  ]);

  if (
    targetUser.privateProfile &&
    !(profiles?.some((a) => a.address === targetUser.address) ?? false)
  )
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
        <LockIcon size={72} weight="thin" />
        Profile Private
      </div>
    );

  return (
    <ProfileProvider profiles={profiles} targetProfile={targetUser} user={toPublicUser(session)}>
      <ProfileBanner profile={targetUser} />
      <Container>
        {targetUser.bannerImgUrl && <ProfileBannerClearance />}
        <div className="flex min-h-screen flex-col gap-4 pt-2 pb-36">
          <ProfileHeader user={targetUser} />
          <ProfileTabs nickname={params.nickname} />
          {props.children}
        </div>
      </Container>
    </ProfileProvider>
  );
}
