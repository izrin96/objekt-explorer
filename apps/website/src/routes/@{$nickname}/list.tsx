import { createFileRoute } from "@tanstack/react-router";

import ProfileLists from "@/components/profile/profile-list";

export const Route = createFileRoute("/@{$nickname}/list")({
  head: () => ({
    meta: [{ title: "Lists · Objekt Tracker" }],
  }),
  component: ProfileListsPage,
  ssr: false,
});

function ProfileListsPage() {
  return <ProfileLists />;
}
