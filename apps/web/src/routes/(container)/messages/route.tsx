import { Outlet, createFileRoute, redirect, useParams } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { BoxTabs } from "@/features/chat/box-tabs";
import { ConversationList } from "@/features/chat/conversation-list";
import { conversationsOptions } from "@/features/chat/queries";
import { messagesSearchSchema } from "@/features/chat/search-schema";
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
  loaderDeps: ({ search }) => ({ box: search.box ?? "inbox" }),
  loader: async ({ context: { queryClient }, deps }) => {
    // a failed read leaves the list to show its error and retry, not the page to fail
    await queryClient
      .infiniteQuery({ ...conversationsOptions(deps.box), staleTime: "static" })
      .catch(() => undefined);
  },
  component: MessagesLayout,
});

function MessagesLayout() {
  const box = Route.useSearch({ select: (search) => search.box ?? "inbox" });
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

  // the frame fills the viewport under the header (and its 1px border), so the thread
  // scrolls inside it and the page does not
  return (
    <div className="bg-card grid h-[calc(100dvh-(--spacing(28))-1px)] min-h-96 grid-rows-1 overflow-hidden rounded-lg border md:grid-cols-[--spacing(80)_minmax(0,1fr)] lg:grid-cols-[--spacing(96)_minmax(0,1fr)]">
      <aside
        className={cn("flex min-h-0 min-w-0 flex-col md:border-r", threadOpen && "max-md:hidden")}
      >
        <div className="flex flex-col gap-3 border-b p-4">
          <h1 className="font-display text-xl font-semibold tracking-tight">{m.chat_title()}</h1>
          <BoxTabs box={box} />
        </div>
        <ConversationList box={box} />
      </aside>
      <section className={cn("flex min-h-0 min-w-0 flex-col", !threadOpen && "max-md:hidden")}>
        {/* on a phone the list and its heading are hidden while a thread is open */}
        {threadOpen ? <h1 className="sr-only md:hidden">{m.chat_title()}</h1> : null}
        <Outlet />
      </section>
    </div>
  );
}
