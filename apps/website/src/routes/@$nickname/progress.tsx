import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/@$nickname/progress")({
  head: () => ({
    meta: [{ title: "Progress · Objekt Tracker" }],
  }),
  component: ProfileProgressPage,
});

function ProfileProgressPage() {
  return <div>Profile Progress</div>;
}
