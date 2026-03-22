import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/@$nickname/list")({
  head: () => ({
    meta: [{ title: "Lists · Objekt Tracker" }],
  }),
  component: ProfileListsPage,
});

function ProfileListsPage() {
  return <div>Profile Lists</div>;
}
