import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import { ProfileProvider } from "@/hooks/use-profile";
import { getUserByIdentifier } from "@/lib/client-fetching";
import { cachedSession } from "@/lib/server/auth";
import { api } from "@/lib/trpc/server";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  params: Promise<{
    nickname: string;
  }>;
}>;

export default async function UserCollectionPage(props: Props) {
  const params = await props.params;

  const session = await cachedSession();

  const [targetUser, profiles] = await Promise.all([
    getUserByIdentifier(params.nickname),
    session ? api.cosmoLink.myLink() : undefined,
  ]);

  return (
    <ProfileProvider profile={targetUser} userProfiles={profiles}>
      <div className="flex flex-col gap-4 pb-8">
        <ProfileHeader user={targetUser} />

        <div className="flex flex-col gap-4">
          <ProfileTabs nickname={params.nickname} />
          {props.children}
        </div>
      </div>
    </ProfileProvider>
  );
}
