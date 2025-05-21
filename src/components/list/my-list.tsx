"use client";

import { Button, Card, Link, Menu, Note, Tabs } from "@/components/ui";
import { api } from "@/lib/trpc/client";
import React from "react";
import { IconDotsVertical } from "@intentui/icons";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-boundary";
import { CreateList, DeleteList, EditList } from "./modal/manage-list";
import { GenerateDiscordFormat } from "./modal/generate-discord";

export default function MyListRender() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <MyList />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function MyList() {
  const [lists] = api.list.myList.useSuspenseQuery();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-semibold">My List</div>

      <Tabs aria-label="Navbar">
        <Tabs.List>
          <Tabs.Tab id="a">Normal List</Tabs.Tab>
          <Tabs.Tab id="b">Profile List</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel id="a" className="flex flex-col gap-4">
          <div className="w-full flex gap-2">
            <CreateList />
            <GenerateDiscordFormat>
              {({ open }) => (
                <Button intent="outline" onClick={open}>
                  Generate Discord Format
                </Button>
              )}
            </GenerateDiscordFormat>
          </div>

          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              <Card key={list.slug} className="bg-secondary/20">
                <Card.Content className="flex justify-between">
                  <Link
                    href={`/list/${list.slug}`}
                    className="font-semibold text-base flex-1"
                  >
                    {list.name}
                  </Link>
                  <EditList slug={list.slug}>
                    {({ open: openEdit }) => (
                      <DeleteList slug={list.slug}>
                        {({ open: openDelete }) => (
                          <Menu>
                            <Button intent="outline" size="extra-small">
                              <IconDotsVertical />
                            </Button>
                            <Menu.Content className="sm:min-w-56">
                              <Menu.Item href={`/list/${list.slug}`}>
                                Open
                              </Menu.Item>
                              <Menu.Item onAction={openEdit}>Edit</Menu.Item>
                              <Menu.Item isDanger onAction={openDelete}>
                                Delete
                              </Menu.Item>
                            </Menu.Content>
                          </Menu>
                        )}
                      </DeleteList>
                    )}
                  </EditList>
                </Card.Content>
              </Card>
            ))}
          </div>
        </Tabs.Panel>
        <Tabs.Panel id="b">
          <Note>This feature is not yet available</Note>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
