import { createFileRoute, Outlet } from "@tanstack/react-router";

import DynamicContainer from "@/components/dynamic-container";
import { PrivateProfileGuard, ProfileProvider } from "@/components/profile-provider";
import { ProfileBanner } from "@/components/profile/profile-banner";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import { getUserByIdentifier } from "@/lib/data-fetching";
import { getSession } from "@/lib/server/auth";
import { sanitizePublicProfile } from "@/lib/server/profile";

export const Route = createFileRoute("/@$nickname")({
  loader: async ({ params }) => {
    const [result, session] = await Promise.all([
      getUserByIdentifier(params.nickname),
      getSession(),
    ]);

    const profile = sanitizePublicProfile(result, session?.user.id);
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
