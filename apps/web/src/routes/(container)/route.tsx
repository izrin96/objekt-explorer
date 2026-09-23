import { Outlet, createFileRoute } from "@tanstack/react-router";

import { PageMain } from "@/components/layout/page-main";

export const Route = createFileRoute("/(container)")({
  component: ContainerLayout,
});

function ContainerLayout() {
  return (
    <PageMain>
      <Outlet />
    </PageMain>
  );
}
