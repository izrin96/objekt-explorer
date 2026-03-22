import { createFileRoute } from "@tanstack/react-router";

import ProgressRender from "@/components/profile/progress/progress-render";

export const Route = createFileRoute("/@$nickname/progress")({
  head: () => ({
    meta: [{ title: "Progress · Objekt Tracker" }],
  }),
  component: ProfileProgressPage,
});

function ProfileProgressPage() {
  return <ProgressRender />;
}
