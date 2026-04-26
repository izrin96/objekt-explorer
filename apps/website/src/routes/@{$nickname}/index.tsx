import { Addresses } from "@repo/lib";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import ProfileObjektRender from "@/components/profile/profile-objekt";
import ProfileObjektServer from "@/components/profile/profile-objekt-server";

const profileRouteApi = getRouteApi("/@{$nickname}");

export const Route = createFileRoute("/@{$nickname}/")({
  head: () => ({
    meta: [{ title: "Profile · Objekt Tracker" }],
  }),
  component: ProfileCollectionPage,
  ssr: false,
});

function ProfileCollectionPage() {
  const { profile } = profileRouteApi.useLoaderData();

  if (profile.address.toLowerCase() === Addresses.SPIN) {
    return <ProfileObjektServer />;
  }

  return <ProfileObjektRender />;
}
