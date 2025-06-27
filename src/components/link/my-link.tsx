"use client";

import { api } from "@/lib/trpc/client";
import React, { useState } from "react";
import { Button, buttonStyles, Card, Link, Menu } from "../ui";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-boundary";
import { IconDotsVertical } from "@intentui/icons";
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

      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
          className="font-semibold text-base flex-1 flex flex-col gap-1 min-w-0"
        >
          <span className="text-lg truncate">
            {link.nickname ?? link.address}
          </span>
          <span className="text-muted-fg text-xs truncate">{link.address}</span>
        </Link>

        <RemoveLinkModal
          address={link.address}
          open={removeOpen}
          setOpen={setRemoveOpen}
        />

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
              <Menu.Item href={`/@${link.nickname ?? link.address}`}>
                Open
              </Menu.Item>
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
