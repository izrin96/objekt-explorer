import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { queueOptions } from "@/features/moderation/console/queries";
import { ModQueue, ModQueueSkeleton } from "@/features/moderation/console/queue";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/mod/reports/")({
  loader: async ({ context: { queryClient } }) => {
    // a failed read leaves the queue to show its error and retry, not the page to fail
    await queryClient.query({ ...queueOptions(), staleTime: "static" }).catch(() => undefined);
  },
  head: () => generateMetadata({ title: m.page_titles_mod_reports() }),
  component: QueuePage,
  pendingComponent: QueuePending,
});

function QueuePage() {
  return (
    <>
      <PageHeader title={m.mod_queue_title()} description={m.mod_queue_description()} />
      <ModQueue />
    </>
  );
}

function QueuePending() {
  return (
    <>
      <PageHeader title={m.mod_queue_title()} description={m.mod_queue_description()} />
      <ModQueueSkeleton />
    </>
  );
}
