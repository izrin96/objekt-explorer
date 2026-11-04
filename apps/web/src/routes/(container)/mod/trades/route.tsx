import { createFileRoute, notFound } from "@tanstack/react-router";

import { canOpenTab } from "@/features/moderation/staff-tabs";

// the dashboard and every staff trade view sit behind the one tab check
export const Route = createFileRoute("/(container)/mod/trades")({
  beforeLoad: ({ context: { viewerRole } }) => {
    if (!canOpenTab("trades", viewerRole)) throw notFound();
  },
});
