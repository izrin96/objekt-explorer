import { createFileRoute } from "@tanstack/react-router";

import ProfileLists from "@/components/profile/profile-list";

export const Route = createFileRoute("/@{$nickname}/list")({
  component: ProfileListsPage,
  ssr: false,
});

function ProfileListsPage() {
  return <ProfileLists />;
}
