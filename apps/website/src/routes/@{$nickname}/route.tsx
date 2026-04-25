import { createFileRoute, Outlet } from "@tanstack/react-router";

import DynamicContainer from "@/components/dynamic-container";
import { PrivateProfileGuard } from "@/components/profile-guard";
import { ProfileBanner } from "@/components/profile/profile-banner";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import { ProfileProvider } from "@/hooks/use-profile-target";
import { getProfileByNickname } from "@/lib/functions/profile";

export const Route = createFileRoute("/@{$nickname}")({
  loader: async ({ params }) => {
    const profile = await getProfileByNickname({ data: { nickname: params.nickname } });
    return { profile };
  },
  component: ProfileLayout,
});

function ProfileLayout() {
  const { profile } = Route.useLoaderData();

  return (
    <ProfileProvider profile={profile}>
      <PrivateProfileGuard profile={profile}>
        <ProfileBanner profile={profile} />
        <DynamicContainer>
          <div className="flex min-h-screen flex-col gap-4 pt-2 pb-36">
            <ProfileHeader user={profile} />
            <ProfileTabs user={profile} />
            <Outlet />
          </div>
        </DynamicContainer>
      </PrivateProfileGuard>
    </ProfileProvider>
  );
}
