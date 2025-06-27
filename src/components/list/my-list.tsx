"use client";

import {
  Button,
  Card,
  Link,
  Menu,
  Note,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from "@/components/ui";
import { api } from "@/lib/trpc/client";
import React, { useState } from "react";
import { IconDotsVertical } from "@intentui/icons";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-boundary";
import {
  CreateListModal,
  DeleteListModal,
  EditListModal,
} from "./modal/manage-list";
import { GenerateDiscordFormatModal } from "./modal/generate-discord";

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
  const [addOpen, setAddOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [lists] = api.list.myList.useSuspenseQuery();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-semibold">My List</div>

      <Tabs aria-label="Navbar">
        <TabList className="w-fit">
          <Tab id="a">Normal List</Tab>
          <Tab id="b">Profile List</Tab>
        </TabList>
        <TabPanel id="a" className="flex flex-col gap-4">
          <CreateListModal open={addOpen} setOpen={setAddOpen} />
          <GenerateDiscordFormatModal open={genOpen} setOpen={setGenOpen} />

          <div className="w-full flex gap-2">
            <Button onClick={() => setAddOpen(true)}>Create list</Button>
            <Button intent="outline" onClick={() => setGenOpen(true)}>
              Generate Discord Format
            </Button>
          </div>

          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              <ListCard list={list} key={list.slug} />
            ))}
          </div>
        </TabPanel>
        <TabPanel id="b">
          <Note>This feature is not yet available</Note>
        </TabPanel>
      </Tabs>
    </div>
  );
}

type ListCardProps = {
  list: {
    name: string;
    slug: string;
  };
};

function ListCard({ list }: ListCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <>
      <EditListModal slug={list.slug} open={editOpen} setOpen={setEditOpen} />
      <DeleteListModal
        slug={list.slug}
        open={deleteOpen}
        setOpen={setDeleteOpen}
      />
      <Card key={list.slug} className="bg-secondary/20">
        <Card.Content className="flex justify-between">
          <Link
            href={`/list/${list.slug}`}
            className="font-semibold text-base flex-1"
          >
            {list.name}
          </Link>
          <div className="flex items-center">
            <Menu>
              <Button intent="outline" size="xs">
                <IconDotsVertical />
              </Button>
              <Menu.Content className="sm:min-w-56">
                <Menu.Item href={`/list/${list.slug}`}>Open</Menu.Item>
                <Menu.Item onAction={() => setEditOpen(true)}>Edit</Menu.Item>
                <Menu.Item isDanger onAction={() => setDeleteOpen(true)}>
                  Delete
                </Menu.Item>
              </Menu.Content>
            </Menu>
          </div>
        </Card.Content>
      </Card>
    </>
  );
}
