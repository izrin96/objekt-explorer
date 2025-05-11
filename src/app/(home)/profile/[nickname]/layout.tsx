import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import { ProfileProvider } from "@/hooks/use-profile";
import { UserProvider } from "@/hooks/use-user";
import { getUserByIdentifier } from "@/lib/client-fetching";
import { cachedSession } from "@/lib/server/auth";
import { fetchUserProfiles } from "@/lib/server/profile";
import { PropsWithChildren } from "react";

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

  return (
    <UserProvider profiles={profiles}>
      <ProfileProvider profile={targetUser}>
        <div className="flex flex-col gap-4 pb-8">
          <ProfileHeader user={targetUser} />

          <div className="flex flex-col gap-4">
            <ProfileTabs nickname={params.nickname} />
            {props.children}
          </div>
        </div>
      </ProfileProvider>
    </UserProvider>
  );
}
