"use client";

import { Button, Card, Link, Menu } from "@/components/ui";
import { api } from "@/lib/trpc/client";
import React from "react";
import { IconDotsVertical } from "@intentui/icons";

export default function MyList() {
  const [lists] = api.list.myList.useSuspenseQuery();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-semibold">My List</div>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <Card key={list.slug} className="bg-secondary/20">
            <Card.Header className="flex justify-between">
              <Link href={`/list/${list.slug}`} className="font-semibold flex-1">
                {list.name}
              </Link>
              <Menu>
                <Menu.Trigger aria-label="Open Menu">
                  <Button intent="outline" size="extra-small">
                    <IconDotsVertical />
                  </Button>
                </Menu.Trigger>
                <Menu.Content className="sm:min-w-56">
                  <Menu.Item isDanger onAction={() => {}}>Delete</Menu.Item>
                </Menu.Content>
              </Menu>
            </Card.Header>
          </Card>
        ))}
      </div>
    </div>
  );
}
