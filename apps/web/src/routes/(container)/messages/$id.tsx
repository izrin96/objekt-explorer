import { ChatsCircleIcon } from "@phosphor-icons/react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { threadOptions } from "@/features/chat/queries";
import { Thread, ThreadSkeleton } from "@/features/chat/thread";
import { generateMetadata } from "@/lib/meta";
import { isNotFound } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/messages/$id")({
  loader: async ({ context: { queryClient }, params }) => {
    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw notFound();
    // a failed read other than not-a-member leaves the thread to show its error and retry
    await queryClient
      .infiniteQuery({ ...threadOptions(id), staleTime: "static" })
      .catch((error: unknown) => {
        if (isNotFound(error)) throw notFound();
      });
    return { id };
  },
  head: () => generateMetadata({ title: m.page_titles_messages() }),
  notFoundComponent: ThreadNotFound,
  pendingComponent: ThreadSkeleton,
  component: ThreadPage,
});

function ThreadPage() {
  const { id } = Route.useLoaderData();
  // keyed so read marks and scroll state never carry over to the next conversation
  return <Thread key={id} id={id} />;
}

function ThreadNotFound() {
  return (
    <EmptyState
      icon={ChatsCircleIcon}
      bordered={false}
      title={m.chat_not_found()}
      className="flex-1"
      action={
        <Button variant="outline" size="sm" render={<Link to="/messages" />}>
          {m.chat_back()}
        </Button>
      }
    />
  );
}
