import { createFileRoute } from "@tanstack/react-router";

import ProfileObjektRender from "@/components/profile/profile-objekt";

export const Route = createFileRoute("/@$nickname/")({
  head: () => ({
    meta: [{ title: "Profile · Objekt Tracker" }],
  }),
  component: ProfileCollectionPage,
});

function ProfileCollectionPage() {
  return <ProfileObjektRender />;
}
