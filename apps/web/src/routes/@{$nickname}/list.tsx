import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/@{$nickname}/list")({
  component: ProfileListsPage,
});

function ProfileListsPage() {
  return <PageHeader title={m.profile_tabs_lists()} />;
}
