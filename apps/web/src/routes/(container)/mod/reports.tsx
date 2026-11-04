import { Outlet, createFileRoute, notFound, useParams } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { queueOptions } from "@/features/moderation/console/queries";
import { ModQueue, ModQueueSkeleton } from "@/features/moderation/console/queue";
import { canOpenTab } from "@/features/moderation/staff-tabs";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/mod/reports")({
  beforeLoad: ({ context: { viewerRole } }) => {
    if (!canOpenTab("reports", viewerRole)) throw notFound();
  },
  loader: async ({ context: { queryClient } }) => {
    // a failed read leaves the queue to show its error and retry, not the page to fail
    await queryClient.query({ ...queueOptions(), staleTime: "static" }).catch(() => undefined);
  },
  component: ConsoleLayout,
  pendingComponent: ConsolePending,
});

function ConsoleLayout() {
  const accountOpen = useParams({ strict: false, select: (params) => params.userId !== undefined });
  return (
    <ConsoleFrame accountOpen={accountOpen} queue={<ModQueue />}>
      <Outlet />
    </ConsoleFrame>
  );
}

function ConsolePending() {
  return <ConsoleFrame accountOpen={false} queue={<ModQueueSkeleton />} />;
}

/**
 * The queue lives here, not in a child route, so picking an account swaps the panes beside it
 * and leaves the queue's scroll where it was. Below `lg` the queue and the open account are
 * two steps, and the heading stays for screen readers only while an account is open.
 */
function ConsoleFrame({
  accountOpen,
  queue,
  children,
}: {
  accountOpen: boolean;
  queue: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <div className={cn(accountOpen && "max-xl:sr-only")}>
        <PageHeader title={m.mod_queue_title()} description={m.mod_queue_description()} />
      </div>
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[--spacing(72)_minmax(0,1fr)_--spacing(80)] xl:items-start">
        <aside
          className={cn(
            "min-w-0 xl:sticky xl:top-18 xl:max-h-[calc(100dvh-(--spacing(24)))] xl:overflow-y-auto",
            accountOpen && "max-xl:hidden",
          )}
        >
          {queue}
        </aside>
        {children}
      </div>
    </>
  );
}
