import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";

import { PageMain } from "@/components/layout/page-main";
import { PendingStatus } from "@/components/router/pending";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonGrid } from "@/features/objekt/skeleton-grid";
import { PrivateProfileGuard } from "@/features/profile/profile-guard";
import { ProfileHeader } from "@/features/profile/profile-header";
import { ProfileNotFound } from "@/features/profile/profile-not-found";
import { ProfileProvider } from "@/features/profile/profile-provider";
import { ProfileStats } from "@/features/profile/profile-stats";
import { ProfileTabs } from "@/features/profile/profile-tabs";
import { profileQuery } from "@/features/profile/queries";
import { useProfileSummary } from "@/features/profile/use-profile-objekts";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/@{$nickname}")({
  loader: ({ params, context: { queryClient } }) =>
    queryClient.query({ ...profileQuery({ nickname: params.nickname }), staleTime: "static" }),
  notFoundComponent: ProfileNotFound,
  component: ProfileLayout,
  pendingComponent: ProfilePending,
});

function ProfileLayout() {
  const { nickname } = Route.useParams();
  const { data: profile } = useSuspenseQuery(profileQuery({ nickname }));

  return (
    <PageMain>
      {profile.isGuard === true ? (
        <PrivateProfileGuard />
      ) : (
        <ProfileProvider profile={profile}>
          <ProfileHeader key={profile.address} profile={profile} />
          <ProfileSummary />
          <ProfileTabs nickname={nickname} />
          <div className="flex min-h-svh flex-col gap-4.5">
            <Outlet />
          </div>
        </ProfileProvider>
      )}
    </PageMain>
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

/** The profile loading: header, stats and tabs in shape, over the objekt grid. */
function ProfilePending() {
  return (
    <PageMain>
      <PendingStatus />
      <div className="flex items-end gap-3.5">
        <Skeleton className="size-16 shrink-0 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border md:grid-cols-4">
        {[0, 1, 2, 3].map((cell) => (
          <div key={cell} className="flex flex-col gap-2 px-3.5 py-3">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="flex gap-4 border-b pb-3">
        {[0, 1, 2, 3, 4].map((tab) => (
          <Skeleton key={tab} className="h-4 w-16" />
        ))}
      </div>
      <SkeletonGrid />
    </PageMain>
  );
}
