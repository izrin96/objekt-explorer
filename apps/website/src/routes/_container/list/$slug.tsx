import { createFileRoute } from "@tanstack/react-router";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ProfileProvider } from "@/components/profile-provider";

export const Route = createFileRoute("/_container/list/$slug")({
  head: () => ({
    meta: [{ title: "List · Objekt Tracker" }],
  }),
  component: ListDetailPage,
});

function ListDetailPage() {
  return (
    <ProfileProvider>
      <div className="flex flex-col gap-4 pt-2 pb-36">
        <ListHeader />
        <ListRender />
      </div>
    </ProfileProvider>
  );
}
