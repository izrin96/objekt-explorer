"use client";

import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { orpc } from "@/lib/orpc/client";
import { parseNickname } from "@/lib/utils";

import ErrorFallbackRender from "../error-boundary";
import { Button, buttonStyles } from "../ui/button";
import { Link } from "../ui/link";
import { Loader } from "../ui/loader";
import { Menu, MenuContent, MenuItem } from "../ui/menu";
import { EditProfileModal, RemoveLinkModal } from "./modal/manage-link";

export default function MyLinkRender() {
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
            <MyLink />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function MyLink() {
  const t = useTranslations("link");
  const { data: links } = useSuspenseQuery(orpc.profile.list.queryOptions());

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full">
        <Link href={`/link/connect`} className={buttonStyles()}>
          {t("link_cosmo")}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <LinkCard key={link.address} link={link} />
        ))}
      </div>
    </div>
  );
}

type LinkCardProps = {
  link: {
    address: string;
    nickname: string | null;
  };
};

function LinkCard({ link }: LinkCardProps) {
  const t = useTranslations("link.card");
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const nickname = parseNickname(link.address, link.nickname);
  const href = `/@${link.nickname || link.address}`;

  return (
    <>
      <RemoveLinkModal address={link.address} open={removeOpen} setOpen={setRemoveOpen} />
      <EditProfileModal
        address={link.address}
        nickname={nickname}
        open={editOpen}
        setOpen={setEditOpen}
      />

      <div className="hover:bg-muted flex flex-col gap-3 rounded-lg border p-4 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <h3 className="truncate font-semibold">
              <Link href={href}>{nickname}</Link>
            </h3>
            <p className="text-muted-fg truncate font-mono text-xs">
              <Link href={href}>{link.address}</Link>
            </p>
          </div>
          <Menu>
            <Button intent="outline" size="sq-xs">
              <EllipsisVerticalIcon className="size-5" />
            </Button>
            <MenuContent placement="bottom right">
              <MenuItem onAction={() => setEditOpen(true)}>{t("edit")}</MenuItem>
              <MenuItem intent="danger" onAction={() => setRemoveOpen(true)}>
                {t("unlink")}
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>
    </>
  );
}
