import { createFileRoute, notFound } from "@tanstack/react-router";

import { canOpenTab } from "@/features/moderation/staff-tabs";
import { MessageTotalsView } from "@/features/moderation/tracking/message-totals";
import { messageTotalsOptions } from "@/features/moderation/tracking/queries";
import { staffRangeSearchSchema } from "@/features/moderation/tracking/search";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/mod/messages")({
  beforeLoad: ({ context: { viewerRole } }) => {
    if (!canOpenTab("messages", viewerRole)) throw notFound();
  },
  validateSearch: staffRangeSearchSchema,
  loaderDeps: ({ search }) => ({ days: search.days }),
  loader: async ({ context: { queryClient }, deps: { days } }) => {
    // a failed read leaves the page to show the error and retry
    await queryClient
      .query({ ...messageTotalsOptions(days), staleTime: "static" })
      .catch(() => undefined);
  },
  head: () => generateMetadata({ title: m.mod_messages_title() }),
  component: MessagesPage,
});

function MessagesPage() {
  const { days } = Route.useSearch();
  return <MessageTotalsView days={days} />;
}
