import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/@$nickname/")({
  head: () => ({
    meta: [{ title: "Profile · Objekt Tracker" }],
  }),
  component: ProfileCollectionPage,
});

function ProfileCollectionPage() {
  return <div>Profile Collection</div>;
}
