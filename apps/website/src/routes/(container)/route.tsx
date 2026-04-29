import { createFileRoute, Outlet } from "@tanstack/react-router";

import DynamicContainer from "@/components/dynamic-container";

export const Route = createFileRoute("/(container)")({
  component: ContainerLayout,
});

function ContainerLayout() {
  return (
    <DynamicContainer>
      <Outlet />
    </DynamicContainer>
  );
}
