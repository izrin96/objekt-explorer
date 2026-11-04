import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { visibleTabs } from "@/features/moderation/staff-tabs";

export const Route = createFileRoute("/(container)/mod/")({
  beforeLoad: ({ context: { viewerRole } }) => {
    const [first] = visibleTabs(viewerRole);
    if (!first) throw notFound();
    throw redirect({ to: first.to, replace: true });
  },
});
