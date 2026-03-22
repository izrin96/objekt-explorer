import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_container")({
  component: ContainerLayout,
});

function ContainerLayout() {
  return (
    <div className="mx-auto w-full max-w-[var(--container-breakpoint)] px-4 [--container-breakpoint:var(--breakpoint-2xl)] sm:px-6 lg:px-8">
      <Outlet />
    </div>
  );
}
