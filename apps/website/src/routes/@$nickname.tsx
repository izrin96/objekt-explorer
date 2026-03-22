import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Suspense } from "react";

import { PrivateProfileGuard, ProfileProvider } from "@/components/profile-provider";
import { ProfileBanner, ProfileBannerClearance } from "@/components/profile/profile-banner";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import { Container } from "@/components/ui/container";
import { getUserByIdentifier } from "@/lib/data-fetching";
import { getSession } from "@/lib/server/auth";
import type { PublicProfile } from "@/lib/universal/user";

export const Route = createFileRoute("/@$nickname")({
  loader: async ({ params }) => {
    const [result, session] = await Promise.all([
      getUserByIdentifier(params.nickname),
      getSession(),
    ]);

    const { ownerId, ...targetProfile } = result;
    const profile: PublicProfile = {
      ...targetProfile,
      isOwned: ownerId && session?.user.id ? ownerId === session.user.id : false,
    };

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
        {profile.bannerImgUrl && (
          <Container className="[--container-breakpoint:var(--breakpoint-2xl)]">
            <ProfileBannerClearance />
          </Container>
        )}
        <Container className="[--container-breakpoint:var(--breakpoint-2xl)]">
          <div className="mx-auto w-full max-w-[var(--container-breakpoint)] px-4 sm:px-6 lg:px-8">
            <div className="flex min-h-screen flex-col gap-4 pt-2 pb-36">
              <ProfileHeader user={profile} />
              <Suspense>
                <ProfileTabs />
              </Suspense>
              <Outlet />
            </div>
          </div>
        </Container>
      </PrivateProfileGuard>
    </ProfileProvider>
  );
}
