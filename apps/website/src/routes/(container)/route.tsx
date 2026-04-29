import { createFileRoute, Outlet } from "@tanstack/react-router";

import DynamicContainer from "@/components/dynamic-container";
import { CommonErrorComponent } from "@/components/error-boundary";

export const Route = createFileRoute("/(container)")({
  component: ContainerLayout,
  errorComponent: CommonErrorComponent,
});

function ContainerLayout() {
  return (
    <DynamicContainer>
      <Outlet />
    </DynamicContainer>
  );
}
