"use client";

import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { orpc } from "@/lib/orpc/client";
import { getListHref, parseNickname } from "@/lib/utils";

import ErrorFallbackRender from "../error-boundary";
import { Button } from "../ui/button";
import { Link } from "../ui/link";
import { Loader } from "../ui/loader";
import { Menu, MenuContent, MenuItem } from "../ui/menu";
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
  const t = useTranslations("list");

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-semibold">{t("title")}</div>

      <CreateListModal open={addOpen} setOpen={setAddOpen} />
      <GenerateDiscordFormatModal open={genOpen} setOpen={setGenOpen} />

      <Tabs aria-label="Navbar" className="w-full">
        <TabList className="w-fit">
          <Tab id="a">{t("tabs.normal")}</Tab>
          <Tab id="b">{t("tabs.profile")}</Tab>
        </TabList>
        <TabPanel id="a" className="flex flex-col gap-4">
          <div className="flex w-full gap-2">
            <Button onPress={() => setAddOpen(true)}>{t("create_button")}</Button>
            <Button intent="outline" onPress={() => setGenOpen(true)}>
              {t("generate_discord_button")}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lists
              .filter((list) => list.listType === "normal")
              .map((list) => (
                <ListCard list={list} key={list.slug} />
              ))}
          </div>
        </TabPanel>
        <TabPanel id="b" className="flex flex-col gap-4">
          <div className="flex w-full gap-2">
            <Button onPress={() => setAddOpen(true)}>{t("create_button")}</Button>
            <Button intent="outline" onPress={() => setGenOpen(true)}>
              {t("generate_discord_button")}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lists
              .filter((list) => list.listType === "profile")
              .map((list) => (
                <ListCard list={list} key={list.slug} />
              ))}
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}

type ListCardProps = {
  list: {
    name: string;
    slug: string;
    listType?: "normal" | "profile";
    nickname?: string | null;
    profileAddress?: string | null;
  };
};

function ListCard({ list }: ListCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const t = useTranslations("list.card");

  const href = getListHref(list);

  return (
    <>
      <EditListModal slug={list.slug} open={editOpen} setOpen={setEditOpen} />
      <DeleteListModal slug={list.slug} open={deleteOpen} setOpen={setDeleteOpen} />
      <Link
        href={href}
        className="hover:bg-muted flex flex-col gap-3 rounded-lg border p-4 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h3 className="font-semibold">{list.name}</h3>
            {list.profileAddress && (
              <span className="text-muted-fg text-sm">
                {parseNickname(list.profileAddress, list.nickname)}
              </span>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <Menu>
              <Button intent="outline" size="sq-xs">
                <EllipsisVerticalIcon className="size-5" />
              </Button>
              <MenuContent placement="bottom right">
                <MenuItem onAction={() => setEditOpen(true)}>{t("edit")}</MenuItem>
                <MenuItem intent="danger" onAction={() => setDeleteOpen(true)}>
                  {t("delete")}
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </div>
      </Link>
    </>
  );
}
