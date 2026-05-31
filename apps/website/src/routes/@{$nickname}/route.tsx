import { GhostIcon } from "@phosphor-icons/react/dist/ssr";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { ProfileBanner } from "@/components/profile/profile-banner";
import { PrivateProfileGuard } from "@/components/profile/profile-guard";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import DynamicContainer from "@/components/shared/dynamic-container";
import { ProfileProvider } from "@/hooks/use-profile-target";
import { profileQuery } from "@/lib/queries/profile";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/@{$nickname}")({
  loader: async ({ params, context: { queryClient } }) => {
    await queryClient.ensureQueryData(profileQuery({ nickname: params.nickname }));
  },
  notFoundComponent: NotFoundComponent,
  component: ProfileLayout,
});

function ProfileLayout() {
  const params = Route.useParams();
  const { data: profile } = useSuspenseQuery(profileQuery({ nickname: params.nickname }));

  if (profile.isGuard) {
    return <PrivateProfileGuard />;
  }

  return (
    <ProfileProvider profile={profile}>
      <ProfileBanner key={profile.address} profile={profile} />
      <DynamicContainer>
        <div className="flex min-h-screen flex-col gap-2 pt-4 pb-36">
          <ProfileHeader user={profile} />
          <ProfileTabs user={profile} />
          <Outlet />
        </div>
      </DynamicContainer>
    </ProfileProvider>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
      <GhostIcon size={72} weight="thin" />
      {m.profile_not_found()}
    </div>
  );
}
