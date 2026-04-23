import type { PropsWithChildren } from "react";

import DynamicContainer from "@/components/dynamic-container";
import { PrivateProfileGuard, ProfileProvider } from "@/components/profile-provider";
import { ProfileBanner } from "@/components/profile/profile-banner";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import { getUserByIdentifier } from "@/lib/data-fetching";
import { getSession } from "@/lib/server/auth";
import { sanitizePublicProfile } from "@/lib/server/profile";

type Props = PropsWithChildren<{
  params: Promise<{
    nickname: string;
  }>;
}>;

export default async function UserCollectionLayout(props: Props) {
  const [params, session] = await Promise.all([props.params, getSession()]);
  const result = await getUserByIdentifier(params.nickname);

  const safeProfile = sanitizePublicProfile(result, session?.user.id);

  return (
    <ProfileProvider targetProfile={safeProfile}>
      <PrivateProfileGuard profile={safeProfile}>
        <ProfileBanner profile={safeProfile} />
        <DynamicContainer>
          <div className="flex min-h-screen flex-col gap-4 pt-2 pb-36">
            <ProfileHeader user={safeProfile} />
            <ProfileTabs user={safeProfile} />
            {props.children}
          </div>
        </DynamicContainer>
      </PrivateProfileGuard>
    </ProfileProvider>
  );
}
