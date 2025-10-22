import { createFileRoute, Outlet } from "@tanstack/react-router";
import AppContainer from "@/components/app-container";

export const Route = createFileRoute("/_container")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <AppContainer>
      <main>
        <Outlet />
      </main>
    </AppContainer>
  );
}
