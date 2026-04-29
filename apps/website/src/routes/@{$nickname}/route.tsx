import { GhostIcon } from "@phosphor-icons/react/dist/ssr";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import DynamicContainer from "@/components/dynamic-container";
import { CommonErrorComponent } from "@/components/error-boundary";
import { PrivateProfileGuard } from "@/components/profile-guard";
import { ProfileBanner } from "@/components/profile/profile-banner";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import { ProfileProvider } from "@/hooks/use-profile-target";
import { profileQuery } from "@/lib/queries/profile";

export const Route = createFileRoute("/@{$nickname}")({
  loader: async ({ params, context: { queryClient } }) => {
    await queryClient.ensureQueryData(profileQuery({ nickname: params.nickname }));
  },
  notFoundComponent: NotFoundComponent,
  errorComponent: CommonErrorComponent,
  component: ProfileLayout,
  wrapInSuspense: true,
});

function ProfileLayout() {
  const params = Route.useParams();
  const { data: profile } = useSuspenseQuery(profileQuery({ nickname: params.nickname }));

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

function NotFoundComponent() {
  const content = useIntlayer("profile");
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
      <GhostIcon size={72} weight="thin" />
      {content.not_found.value}
    </div>
  );
}
