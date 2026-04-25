import { createFileRoute, Outlet } from "@tanstack/react-router";

import DynamicContainer from "@/components/dynamic-container";
import { PrivateProfileGuard, ProfileProvider } from "@/components/profile-provider";
import { ProfileBanner } from "@/components/profile/profile-banner";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";

export const Route = createFileRoute("/@$nickname")({
  loader: async ({ params, context: { orpc } }) => {
    // todo: move to serverFn
    const profile = await orpc.profile.get.call(params.nickname);
    return { profile };
  },
  component: ProfileLayout,
});

function ProfileLayout() {
  const { profile } = Route.useLoaderData();

  return (
    <ProfileProvider targetProfile={profile}>
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
