import { CHAT_BOXES, type ChatBox } from "@repo/api/schemas/chat";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";

import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { m } from "@/paraglide/messages";

import { requestCountOptions } from "./queries";

const LABEL: Record<ChatBox, () => string> = {
  inbox: m.chat_box_inbox,
  requests: m.chat_box_requests,
  archived: m.chat_box_archived,
};

const boxSearch = (box: ChatBox) => ({ box: box === "inbox" ? undefined : box });

/** Each folder is a real link; arrow keys move the selection, so they navigate too. */
export function BoxTabs({ box }: { box: ChatBox }) {
  const navigate = useNavigate();
  const { data: requests = 0 } = useQuery(requestCountOptions());

  return (
    <Tabs
      value={box}
      onValueChange={(value, details) => {
        const next = CHAT_BOXES.find((item) => item === value);
        if (!next || next === box || details.event?.type === "click") return;
        void navigate({ to: "/messages", search: boxSearch(next) });
      }}
    >
      <TabsList aria-label={m.chat_box_label()} className="w-full *:flex-1">
        {CHAT_BOXES.map((item) => (
          <TabsTab
            key={item}
            value={item}
            nativeButton={false}
            render={<Link to="/messages" search={boxSearch(item)} />}
          >
            {LABEL[item]()}
            {item === "requests" && requests > 0 ? (
              <>
                <span aria-hidden className="text-muted-foreground font-mono text-xs tabular-nums">
                  {requests > 99 ? "99+" : requests}
                </span>
                <span className="sr-only">{m.chat_box_requests_count({ count: requests })}</span>
              </>
            ) : null}
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  );
}
