import { createFileRoute, redirect } from "@tanstack/react-router";

import MyListRender from "@/components/list/my-list";
import { sessionOptions } from "@/lib/query-options";

export const Route = createFileRoute("/(container)/list/")({
  head: () => ({
    meta: [{ title: "My List · Objekt Tracker" }],
  }),
  beforeLoad: async ({ context: { queryClient } }) => {
    const session = await queryClient.ensureQueryData(sessionOptions);
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
