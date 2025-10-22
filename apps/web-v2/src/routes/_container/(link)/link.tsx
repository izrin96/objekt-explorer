import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_container/(link)/link")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(context.orpc.session.queryOptions());
    if (!session?.user) {
      throw redirect({
        to: "/",
      });
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
