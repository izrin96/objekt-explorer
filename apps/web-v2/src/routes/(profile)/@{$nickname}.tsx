import { GhostIcon, LockIcon } from "@phosphor-icons/react/dist/ssr";
import { useSuspenseQueries } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import AppContainer from "@/components/app-container";
import { ProfileBanner, ProfileBannerClearance } from "@/components/profile/profile-banner";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileTabs from "@/components/profile/profile-tabs";
import { Container } from "@/components/ui/container";
import { TargetProvider } from "@/hooks/use-target";
import { UserProvider } from "@/hooks/use-user";
import { orpc } from "@/lib/orpc/client";

export const Route = createFileRoute("/(profile)/@{$nickname}")({
  component: RouteComponent,
  loader: async ({ context, params: { nickname } }) => {
    await context.queryClient.ensureQueryData(
      context.orpc.profile.findPublic.queryOptions({ input: { nickname } }),
    );

    // prefetch
    context.queryClient.prefetchQuery(
      context.orpc.profile.findPublic.queryOptions({ input: { nickname } }),
    );
    context.queryClient.prefetchQuery(context.orpc.profile.list.queryOptions());
  },
  notFoundComponent: () => <NotFound />,
});

function RouteComponent() {
  const { nickname } = Route.useParams();
  const [{ data: profile }, { data: profiles }] = useSuspenseQueries({
    queries: [
      orpc.profile.findPublic.queryOptions({ input: { nickname } }),
      orpc.profile.list.queryOptions(),
    ],
  });

  const isOwned = profiles.some((a) => a.address === profile.address);

  if (profile.privateProfile && !isOwned)
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
        <LockIcon size={72} weight="thin" />
        Profile Private
      </div>
    );

  return (
    <UserProvider profiles={profiles}>
      <TargetProvider profile={profile}>
        <ProfileBanner profile={profile} />
        {profile.bannerImgUrl && (
          <Container>
            <ProfileBannerClearance />
          </Container>
        )}
        <AppContainer>
          <div className="flex min-h-screen flex-col gap-4 pt-2 pb-36">
            <ProfileHeader user={profile} />
            <ProfileTabs />
            <Outlet />
          </div>
        </AppContainer>
      </TargetProvider>
    </UserProvider>
  );
}

function NotFound() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
      <GhostIcon size={72} weight="thin" />
      User not found
    </div>
  );
}
