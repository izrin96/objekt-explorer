"use client";

import React from "react";
import { Tabs } from "../ui";
import { usePathname } from "next/navigation";

export default function ProfileTabs({ nickname }: { nickname: string }) {
  const pathname = usePathname();
  return (
    <div className="overflow-x-auto">
      <Tabs aria-label="Navbar" className="w-min" selectedKey={pathname}>
        <Tabs.List
          items={[
            { url: `/@${nickname}`, label: "Collection" },
            { url: `/@${nickname}/trades`, label: "Trade History" },
            { url: `/@${nickname}/progress`, label: "Progress" },
            { url: `/@${nickname}/stats`, label: "Statistics" },
          ]}
        >
          {(item) => (
            <Tabs.Tab id={item.url} href={item.url}>
              {item.label}
            </Tabs.Tab>
          )}
        </Tabs.List>
      </Tabs>
    </div>
  );
}
