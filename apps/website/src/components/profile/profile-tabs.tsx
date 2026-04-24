import { Addresses } from "@repo/lib";
import { useLocation } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import type { PublicProfile } from "@/lib/universal/user";

import { Tab, TabList, Tabs } from "../intentui/tabs";

export default function ProfileTabs({ user }: { user: PublicProfile }) {
  const content = useIntlayer("profile");
  const { pathname } = useLocation();
  const path = user.nickname || user.address;

  const disabled = user.address.toLowerCase() === Addresses.SPIN;

  const translationMap = {
    collection: content.tabs.collection.value,
    trade_history: content.tabs.trade_history.value,
    progress: content.tabs.progress.value,
    statistics: content.tabs.statistics.value,
    lists: content.tabs.lists.value,
  };

  const items = [
    { url: `/@${path}`, translationKey: "collection" as const },
    { url: `/@${path}/trades`, translationKey: "trade_history" as const },
    { url: `/@${path}/progress`, translationKey: "progress" as const, disabled },
    { url: `/@${path}/stats`, translationKey: "statistics" as const, disabled },
    { url: `/@${path}/list`, translationKey: "lists" as const, disabled },
  ];

  const filteredItems = items.filter((a) => !a.disabled);

  return (
    <Tabs
      aria-label="Navbar"
      className="w-full overflow-x-auto px-3 py-1"
      selectedKey={decodeURIComponent(pathname)}
    >
      <TabList className="border-b-0">
        {filteredItems.map((item) => (
          <Tab
            key={item.url}
            id={item.url}
            href={item.url}
            aria-label={translationMap[item.translationKey]}
          >
            {translationMap[item.translationKey]}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
}
