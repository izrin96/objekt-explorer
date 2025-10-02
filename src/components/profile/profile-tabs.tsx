"use client";

import { usePathname } from "next/navigation";
import { Tab, TabList, Tabs } from "../ui/tabs";

export default function ProfileTabs({ path }: { path: string }) {
  const pathname = usePathname();
  const items = [
    { url: `/@${path}`, label: "Collection" },
    { url: `/@${path}/trades`, label: "Trade History" },
    { url: `/@${path}/progress`, label: "Progress" },
    { url: `/@${path}/stats`, label: "Statistics" },
  ];
  return (
    <div className="overflow-x-auto">
      <Tabs aria-label="Navbar" className="w-min" selectedKey={decodeURIComponent(pathname)}>
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
