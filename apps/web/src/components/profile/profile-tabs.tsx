"use client";

import { usePathname } from "next/navigation";

import { useTarget } from "@/hooks/use-target";

import { Tab, TabList, Tabs } from "../ui/tabs";

export default function ProfileTabs() {
  const profile = useTarget((a) => a.profile)!;
  const pathname = usePathname();
  const path = profile.nickname ?? profile.address;

  const items = [
    { url: `/@${path}`, label: "Collection" },
    { url: `/@${path}/trades`, label: "Trade History" },
    { url: `/@${path}/progress`, label: "Progress" },
    { url: `/@${path}/stats`, label: "Statistics" },
  ];

  return (
    <Tabs
      aria-label="Navbar"
      className="w-full overflow-x-auto px-3 py-1"
      selectedKey={decodeURIComponent(pathname)}
    >
      <TabList className="border-b-0">
        {items.map((item) => (
          <Tab key={item.url} id={item.url} href={item.url} aria-label={item.label}>
            {item.label}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
}
