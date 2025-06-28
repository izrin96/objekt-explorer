"use client";

import { IconDotsVertical } from "@intentui/icons";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { api } from "@/lib/trpc/client";
import ErrorFallbackRender from "../error-boundary";
import { Button, buttonStyles, Card, Link, Menu } from "../ui";
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
  const [links] = api.profile.getAll.useSuspenseQuery();

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full">
        <Link
          href={`/link/onboard`}
          className={(renderProps) =>
            buttonStyles({
              ...renderProps,
            })
          }
        >
          Link Cosmo
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
    nickname: string;
  };
};

function LinkCard({ link }: LinkCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  return (
    <Card key={link.address} className="bg-secondary/20">
      <Card.Content className="flex justify-between">
        <Link
          href={`/@${link.nickname ?? link.address}`}
          className="flex min-w-0 flex-1 flex-col gap-1 font-semibold text-base"
        >
          <span className="truncate text-lg">{link.nickname ?? link.address}</span>
          <span className="truncate text-muted-fg text-xs">{link.address}</span>
        </Link>

        <RemoveLinkModal address={link.address} open={removeOpen} setOpen={setRemoveOpen} />

        <EditProfileModal
          address={link.address}
          nickname={link.nickname}
          open={editOpen}
          setOpen={setEditOpen}
        />

        <div className="flex items-center">
          <Menu>
            <Button intent="outline" size="xs">
              <IconDotsVertical />
            </Button>
            <Menu.Content className="sm:min-w-56">
              <Menu.Item href={`/@${link.nickname ?? link.address}`}>Open</Menu.Item>
              <Menu.Item onAction={() => setEditOpen(true)}>Edit</Menu.Item>
              <Menu.Item isDanger onAction={() => setRemoveOpen(true)}>
                Unlink
              </Menu.Item>
            </Menu.Content>
          </Menu>
        </div>
      </Card.Content>
    </Card>
  );
}
