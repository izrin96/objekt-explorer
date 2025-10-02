"use client";

import { IconDotsVertical } from "@intentui/icons";
import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { orpc } from "@/lib/orpc/client";
import { parseNickname } from "@/lib/utils";
import ErrorFallbackRender from "../error-boundary";
import { Button, buttonStyles } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Link } from "../ui/link";
import { Menu, MenuContent, MenuItem } from "../ui/menu";
import { EditProfileModal, RemoveLinkModal } from "./modal/manage-link";

export default function MyLinkRender() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <MyLink />
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
        <Link
          href={`/link/connect`}
          className={(renderProps) =>
            buttonStyles({
              ...renderProps,
            })
          }
        >
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
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const nickname = parseNickname(link.address, link.nickname);
  return (
    <Card className="bg-secondary/20">
      <CardContent className="flex justify-between">
        <Link
          href={`/@${link.nickname ?? link.address}`}
          className="flex min-w-0 flex-1 flex-col gap-1 text-base"
        >
          <span className="truncate font-semibold text-lg">{nickname}</span>
          <span className="truncate font-mono text-muted-fg text-xs">{link.address}</span>
        </Link>

        <RemoveLinkModal address={link.address} open={removeOpen} setOpen={setRemoveOpen} />

        <EditProfileModal
          address={link.address}
          nickname={nickname}
          open={editOpen}
          setOpen={setEditOpen}
        />

        <div className="flex items-center">
          <Menu>
            <Button intent="outline" size="sq-xs">
              <IconDotsVertical />
            </Button>
            <MenuContent className="sm:min-w-56">
              <MenuItem href={`/@${link.nickname ?? link.address}`}>Open</MenuItem>
              <MenuItem onAction={() => setEditOpen(true)}>Edit</MenuItem>
              <MenuItem isDanger onAction={() => setRemoveOpen(true)}>
                Unlink
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </CardContent>
    </Card>
  );
}
