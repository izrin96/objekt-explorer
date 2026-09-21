import { createRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

import { ActivityView } from "@/components/profile/activity-view";
import { CollectionView } from "@/components/profile/collection-view";
import { ListsView, useProfileLists } from "@/components/profile/lists-view";
import { uniqueCollections, useScopedProfile } from "@/components/profile/profile-data";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileStats } from "@/components/profile/profile-stats";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { ProgressView } from "@/components/profile/progress-view";
import { StatsView } from "@/components/profile/stats-view";
import { rootRoute } from "@/routes/root";
import { useLocks } from "@/store/lock";
import { usePins } from "@/store/pins";
import { useSnapshot } from "@/store/snapshot";

function Profile() {
  const { nickname } = profileRoute.useParams();
  const profile = useScopedProfile(nickname);
  const lists = useProfileLists(nickname);
  // the pin and lock counts are the stores', not the fixture's, so acting
  // from the select bar moves the stat the same commit it moves the grid
  const pins = usePins(profile);
  const locks = useLocks(profile);

  // a past state of one Cosmo means nothing on another, so the snapshot does
  // not survive the route param — the same reset the website gets for free by
  // navigating to a URL with no `?at=`. One place, not one per tab.
  useEffect(() => useSnapshot.getState().clear, [nickname]);

  return (
    <>
      <ProfileHeader key={nickname} profile={profile} />
      <ProfileStats
        cells={[
          { value: profile.objekts.length, label: "objekts owned" },
          { value: uniqueCollections(profile.objekts), unit: "unique", label: "collections" },
          {
            value: pins.ids.length,
            label: `pinned · ${locks.ids.length} locked`,
          },
          { value: "2.1", unit: "%", label: "of all tripleS objekts" },
        ]}
      />
      <ProfileTabs nickname={nickname} count={profile.objekts.length} listCount={lists.length} />
      <Outlet />
    </>
  );
}

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$nickname",
  component: Profile,
});

function Collection() {
  const { nickname } = profileRoute.useParams();
  return <CollectionView key={nickname} profile={useScopedProfile(nickname)} />;
}

function Progress() {
  const { nickname } = profileRoute.useParams();
  return <ProgressView profile={useScopedProfile(nickname)} />;
}

function Activity() {
  const { nickname } = profileRoute.useParams();
  return <ActivityView key={nickname} profile={useScopedProfile(nickname)} />;
}

function Stats() {
  const { nickname } = profileRoute.useParams();
  return <StatsView profile={useScopedProfile(nickname)} />;
}

function Lists() {
  const { nickname } = profileRoute.useParams();
  return <ListsView profile={useScopedProfile(nickname)} />;
}

export const collectionRoute = createRoute({
  getParentRoute: () => profileRoute,
  path: "/",
  component: Collection,
});

export const progressRoute = createRoute({
  getParentRoute: () => profileRoute,
  path: "/progress",
  component: Progress,
});

export const profileActivityRoute = createRoute({
  getParentRoute: () => profileRoute,
  path: "/activity",
  component: Activity,
});

export const profileStatsRoute = createRoute({
  getParentRoute: () => profileRoute,
  path: "/stats",
  component: Stats,
});

export const profileListsRoute = createRoute({
  getParentRoute: () => profileRoute,
  path: "/lists",
  component: Lists,
});
