import { createFileRoute, redirect } from "@tanstack/react-router";

import MyListRender from "@/components/list/my-list";
import { orpc } from "@/lib/orpc/client";

export const Route = createFileRoute("/_container/list/")({
  head: () => ({
    meta: [{ title: "My List · Objekt Tracker" }],
  }),
  beforeLoad: async ({ context: { queryClient } }) => {
    const session = await queryClient.ensureQueryData(orpc.user.session.queryOptions());
    if (!session) {
      throw redirect({ to: "/" });
    }
  },
  component: ListPage,
});

function ListPage() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <MyListRender />
    </div>
  );
}
