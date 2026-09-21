import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";

export const Route = createFileRoute("/@{$nickname}/")({
  component: ProfilePage,
});

function ProfilePage() {
  const { nickname } = Route.useParams();

  return <PageHeader title={nickname} />;
}
