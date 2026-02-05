"use client";

import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { orpc } from "@/lib/orpc/client";

import ErrorFallbackRender from "../error-boundary";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Link } from "../ui/link";
import { Loader } from "../ui/loader";
import { Menu, MenuContent, MenuItem } from "../ui/menu";
import { Note } from "../ui/note";
import { Tab, TabList, TabPanel, Tabs } from "../ui/tabs";
import { GenerateDiscordFormatModal } from "./modal/generate-discord";
import { CreateListModal, DeleteListModal, EditListModal } from "./modal/manage-list";

export default function MyListRender() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <Suspense
            fallback={
              <div className="flex justify-center">
                <Loader variant="ring" />
              </div>
            }
          >
            <MyList />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function MyList() {
  const [addOpen, setAddOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const { data: lists } = useSuspenseQuery(orpc.list.list.queryOptions());

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-semibold">My List</div>

      <Tabs aria-label="Navbar" className="w-full">
        <TabList className="w-fit">
          <Tab id="a">Normal List</Tab>
          <Tab id="b">Profile List</Tab>
        </TabList>
        <TabPanel id="a" className="flex flex-col gap-4">
          <CreateListModal open={addOpen} setOpen={setAddOpen} />
          <GenerateDiscordFormatModal open={genOpen} setOpen={setGenOpen} />

          <div className="flex w-full gap-2">
            <Button onPress={() => setAddOpen(true)}>Create list</Button>
            <Button intent="outline" onPress={() => setGenOpen(true)}>
              Generate Discord format
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
      <DeleteListModal slug={list.slug} open={deleteOpen} setOpen={setDeleteOpen} />
      <Card key={list.slug}>
        <CardContent className="flex justify-between">
          <Link href={`/list/${list.slug}`} className="flex-1 text-base font-semibold">
            {list.name}
          </Link>
          <div className="flex items-center">
            <Menu>
              <Button intent="outline" size="sq-xs">
                <EllipsisVerticalIcon className="size-5" />
              </Button>
              <MenuContent className="sm:min-w-56">
                <MenuItem href={`/list/${list.slug}`}>Open</MenuItem>
                <MenuItem onAction={() => setEditOpen(true)}>Edit</MenuItem>
                <MenuItem intent="danger" onAction={() => setDeleteOpen(true)}>
                  Delete
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
