import type { ChatBox } from "@repo/api/schemas/chat";
import { Outlet, createFileRoute, redirect, useLocation, useParams } from "@tanstack/react-router";
import { type ReactNode, useEffect, useRef } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { BoxTabs } from "@/features/chat/box-tabs";
import { ConversationList, ConversationListSkeleton } from "@/features/chat/conversation-list";
import { conversationsOptions } from "@/features/chat/queries";
import { boxOf, messagesSearchSchema } from "@/features/chat/search-schema";
import { currentUserOptions } from "@/features/user/queries";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

// on the layout so the list keeps its folder while a thread is open beside it
export const Route = createFileRoute("/(container)/messages")({
  validateSearch: messagesSearchSchema,
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    if (!user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  loaderDeps: ({ search }) => ({ box: boxOf(search) }),
  loader: async ({ context: { queryClient }, deps }) => {
    // a failed read leaves the list to show its error and retry, not the page to fail
    await queryClient
      .infiniteQuery({ ...conversationsOptions(deps.box), staleTime: "static" })
      .catch(() => undefined);
  },
  component: MessagesLayout,
  pendingComponent: MessagesPending,
});

function MessagesLayout() {
  const box = Route.useSearch({ select: boxOf });
  const openId = useParams({ strict: false, select: (params) => params.id });
  const threadOpen = openId !== undefined;
  const lastOpen = useRef(openId);

  // below `md` the thread hides on the way back, taking focus with it: return to its row
  useEffect(() => {
    const left = lastOpen.current;
    lastOpen.current = openId;
    if (openId !== undefined || left === undefined) return;
    if (!window.matchMedia("(width < 48rem)").matches) return;
    document.querySelector<HTMLElement>(`[data-conversation-link="${CSS.escape(left)}"]`)?.focus();
  }, [openId]);

  return (
    <MessagesFrame box={box} threadOpen={threadOpen} list={<ConversationList box={box} />}>
      {/* on a phone the list and its heading are hidden while a thread is open */}
      {threadOpen ? <h1 className="sr-only md:hidden">{m.chat_title()}</h1> : null}
      <Outlet />
    </MessagesFrame>
  );
}

/** The conversation list loading: the page's frame, with the list's skeleton in place. */
function MessagesPending() {
  const box = useLocation({
    select: (location) => boxOf(messagesSearchSchema.parse(location.search)),
  });
  return <MessagesFrame box={box} threadOpen={false} list={<ConversationListSkeleton />} />;
}

/**
 * The frame fills the viewport under the nav (and its 1px border) and the page header, so
 * the thread scrolls inside it and the page does not; a phone's open thread drops the header.
 */
function MessagesFrame({
  box,
  threadOpen,
  list,
  children,
}: {
  box: ChatBox;
  threadOpen: boolean;
  list: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <div className={cn(threadOpen && "max-md:hidden")}>
        <PageHeader title={m.chat_title()} description={m.chat_page_description()} />
      </div>
      <div
        className={cn(
          "bg-card grid h-[calc(100dvh-(--spacing(45))-1px)] min-h-96 grid-rows-1 overflow-hidden rounded-lg border md:grid-cols-[--spacing(80)_minmax(0,1fr)] lg:grid-cols-[--spacing(96)_minmax(0,1fr)]",
          threadOpen && "max-md:h-[calc(100dvh-(--spacing(28))-1px)]",
        )}
      >
        <aside
          className={cn("flex min-h-0 min-w-0 flex-col md:border-r", threadOpen && "max-md:hidden")}
        >
          <BoxTabs box={box} />
          {list}
        </aside>
        <section className={cn("flex min-h-0 min-w-0 flex-col", !threadOpen && "max-md:hidden")}>
          {children}
        </section>
      </div>
    </>
  );
}
