import { Outlet, createFileRoute } from "@tanstack/react-router";

import { cn, containerClass } from "@/lib/utils";

export const Route = createFileRoute("/@{$nickname}")({
  component: ProfileLayout,
});

function ProfileLayout() {
  return (
    <main
      data-overflow-guard
      className={cn(containerClass, "flex flex-col gap-4.5 px-5 pt-5 pb-10")}
    >
      <Outlet />
    </main>
  );
}
