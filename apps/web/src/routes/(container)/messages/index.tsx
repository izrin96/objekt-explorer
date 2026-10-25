import { ChatsCircleIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/messages/")({
  head: () => generateMetadata({ title: m.page_titles_messages() }),
  component: PickConversation,
});

/** The empty right pane on desktop; below `md` the layout hides it and the list fills the page. */
function PickConversation() {
  return (
    <EmptyState
      icon={ChatsCircleIcon}
      bordered={false}
      title={m.chat_pick_title()}
      hint={m.chat_pick_hint()}
      className="flex-1"
    />
  );
}
