import { Addresses } from "@repo/lib";
import { linkOptions, useLocation, useRouter } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import type { PublicProfile } from "@/lib/universal/user";

import { TabLink, TabList, Tabs } from "../intentui/tabs";

export default function ProfileTabs({ user }: { user: PublicProfile }) {
  const content = useIntlayer("profile");
  const router = useRouter();
  const pathname = useLocation({ select: (s) => s.pathname });
  const nickname = user.nickname || user.address;

  const disabled = user.address.toLowerCase() === Addresses.SPIN;

  const items = linkOptions([
    {
      to: `/@{$nickname}`,
      params: { nickname },
      label: content.tabs.collection.value,
      disabled: false,
    },
    {
      to: `/@{$nickname}/trades`,
      params: { nickname },
      label: content.tabs.trade_history.value,
      disabled: false,
    },
    {
      to: `/@{$nickname}/progress`,
      params: { nickname },
      label: content.tabs.progress.value,
      disabled,
    },
    {
      to: `/@{$nickname}/stats`,
      params: { nickname },
      label: content.tabs.statistics.value,
      disabled,
    },
    { to: `/@{$nickname}/list`, params: { nickname }, label: content.tabs.lists.value, disabled },
  ]);

  const filteredItems = items.filter((a) => !a.disabled);

  return (
    <Tabs aria-label="Navbar" className="w-full overflow-x-auto px-3 py-1" selectedKey={pathname}>
      <TabList className="border-b-0">
        {filteredItems.map(({ label, disabled: _, ...item }) => {
          const pathname = router.buildLocation(item).pathname;
          return (
            <TabLink {...item} id={pathname} key={pathname} aria-label={label} resetScroll={false}>
              {label}
            </TabLink>
          );
        })}
      </TabList>
    </Tabs>
  );
}
