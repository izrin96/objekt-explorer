"use client";

import { usePathname } from "next/navigation";
import { Tab, TabList, Tabs } from "../ui";

export default function ProfileTabs({ nickname }: { nickname: string }) {
  const pathname = usePathname();
  const items = [
    { url: `/@${nickname}`, label: "Collection" },
    { url: `/@${nickname}/trades`, label: "Trade History" },
    { url: `/@${nickname}/progress`, label: "Progress" },
    { url: `/@${nickname}/stats`, label: "Statistics" },
  ];
  return (
    <div className="overflow-x-auto">
      <Tabs aria-label="Navbar" className="w-min" selectedKey={pathname}>
        <TabList>
          {items.map((item) => (
            <Tab key={item.url} id={item.url} href={item.url}>
              {item.label}
            </Tab>
          ))}
        </TabList>
      </Tabs>
    </div>
  );
}
