import { IconDotsVertical } from "@intentui/icons";
import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { orpc } from "@/lib/orpc/client";
import ErrorFallbackRender from "../error-boundary";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Link } from "../ui/link";
import { Menu, MenuContent, MenuItem, MenuItemLink } from "../ui/menu";
import { Note } from "../ui/note";
import { Tab, TabList, TabPanel, Tabs } from "../ui/tabs";
import { GenerateDiscordFormatModal } from "./modal/generate-discord";
import { CreateListModal, DeleteListModal, EditListModal } from "./modal/manage-list";

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
  const { data: lists } = useSuspenseQuery(orpc.list.list.queryOptions());

  return (
    <div className="flex flex-col gap-4">
      <div className="font-semibold text-xl">My List</div>

      <Tabs aria-label="Navbar">
        <TabList className="w-fit">
          <Tab id="a">Normal List</Tab>
          <Tab id="b">Profile List</Tab>
        </TabList>
        <TabPanel id="a" className="flex flex-col gap-4">
          <CreateListModal open={addOpen} setOpen={setAddOpen} />
          <GenerateDiscordFormatModal open={genOpen} setOpen={setGenOpen} />

          <div className="flex w-full gap-2">
            <Button onClick={() => setAddOpen(true)}>Create list</Button>
            <Button intent="outline" onClick={() => setGenOpen(true)}>
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
          <Link
            to="/list/$slug"
            params={{
              slug: list.slug,
            }}
            className="flex-1 font-semibold text-base"
          >
            {list.name}
          </Link>
          <div className="flex items-center">
            <Menu>
              <Button intent="outline" size="sq-xs">
                <IconDotsVertical />
              </Button>
              <MenuContent className="sm:min-w-56">
                <MenuItemLink to="/list/$slug" params={{ slug: list.slug }}>
                  Open
                </MenuItemLink>
                <MenuItem onAction={() => setEditOpen(true)}>Edit</MenuItem>
                <MenuItem isDanger onAction={() => setDeleteOpen(true)}>
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
