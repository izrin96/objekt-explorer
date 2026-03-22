import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/@$nickname")({
  component: ProfileLayout,
});

function ProfileLayout() {
  return (
    <div className="mx-auto w-full max-w-[var(--container-breakpoint)] px-4 sm:px-6 lg:px-8">
      <Outlet />
    </div>
  );
}
