import { createFileRoute, redirect } from "@tanstack/react-router";
import MyListRender from "@/components/list/my-list";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_container/list/")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(context.orpc.session.queryOptions());
    if (!session?.user) {
      throw redirect({
        to: "/",
      });
    }
    context.queryClient.prefetchQuery(context.orpc.list.list.queryOptions());
  },
  head: () => ({
    meta: seo({ title: "My list" }),
  }),
});

function RouteComponent() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <MyListRender />
    </div>
  );
}
