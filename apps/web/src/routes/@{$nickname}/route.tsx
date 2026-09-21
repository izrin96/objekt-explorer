import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";

import { NotFoundComponent } from "@/components/router/not-found";
import { PrivateProfileGuard } from "@/features/profile/profile-guard";
import { ProfileHeader } from "@/features/profile/profile-header";
import { ProfileProvider } from "@/features/profile/profile-provider";
import { ProfileStats } from "@/features/profile/profile-stats";
import { ProfileTabs } from "@/features/profile/profile-tabs";
import { profileQuery } from "@/features/profile/queries";
import { useProfileSummary } from "@/features/profile/use-profile-objekts";
import { cn, containerClass } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/@{$nickname}")({
  loader: ({ params, context: { queryClient } }) =>
    queryClient.ensureQueryData(profileQuery({ nickname: params.nickname })),
  notFoundComponent: NotFoundComponent,
  component: ProfileLayout,
});

function ProfileLayout() {
  const { nickname } = Route.useParams();
  const { data: profile } = useSuspenseQuery(profileQuery({ nickname }));

  return (
    <main
      data-overflow-guard
      className={cn(containerClass, "flex flex-col gap-4.5 px-5 pt-5 pb-10")}
    >
      {profile.isGuard === true ? (
        <PrivateProfileGuard />
      ) : (
        <ProfileProvider profile={profile}>
          <ProfileHeader key={profile.address} profile={profile} />
          <ProfileSummary />
          <ProfileTabs nickname={nickname} />
          <Outlet />
        </ProfileProvider>
      )}
    </main>
  );
}

function ProfileSummary() {
  const summary = useProfileSummary();
  const count = (value: number) =>
    summary.isPending ? "—" : `${value.toLocaleString()}${summary.partial ? "+" : ""}`;

  return (
    <ProfileStats
      cells={[
        { value: count(summary.owned), label: m.profile_stats_owned() },
        {
          value: count(summary.collections),
          unit: m.profile_stats_unique(),
          label: m.profile_stats_collections(),
        },
        { value: summary.pins.toLocaleString(), label: m.profile_stats_pinned() },
        { value: summary.locks.toLocaleString(), label: m.profile_stats_locked() },
      ]}
    />
  );
}
