"use client";

import { api } from "@/lib/trpc/client";
import React, { useState } from "react";
import {
  Button,
  buttonStyles,
  Card,
  Form,
  Link,
  Menu,
  Modal,
  Note,
} from "../ui";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-boundary";
import { IconDotsVertical } from "@intentui/icons";

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
  const [links] = api.cosmoLink.myList.useSuspenseQuery();

  return (
    <div className="flex flex-col gap-4">
      <Note className="w-full" intent="info">
        After linking, your Discord information will be displayed in your COSMO
        ID. Currently, there are no privacy options available, but we&apos;re
        working on it.
      </Note>

      <div className="w-full">
        <Link
          href={`/link/onboard`}
          className={(renderProps) =>
            buttonStyles({
              ...renderProps,
            })
          }
        >
          Link COSMO ID
        </Link>
      </div>

      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Card key={link.address} className="bg-secondary/20">
            <Card.Content className="flex justify-between">
              <Link
                href={`/@${link.nickname ?? link.address}`}
                className="font-semibold text-base flex-1 flex flex-col gap-1 min-w-0"
              >
                <span className="text-lg truncate">{link.nickname ?? link.address}</span>
                <span className="text-muted-fg text-xs truncate">{link.address}</span>
              </Link>
              <RemoveLink address={link.address}>
                {({ open: openUnlink }) => (
                  <Menu>
                    <Button intent="outline" size="extra-small">
                      <IconDotsVertical />
                    </Button>
                    <Menu.Content className="sm:min-w-56">
                      <Menu.Item href={`/@${link.nickname ?? link.address}`}>
                        Open
                      </Menu.Item>
                      <Menu.Item isDanger onAction={openUnlink}>
                        Unlink
                      </Menu.Item>
                    </Menu.Content>
                  </Menu>
                )}
              </RemoveLink>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RemoveLink({
  address,
  children,
}: {
  address: string;
  children: ({ open }: { open: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const removeLink = api.cosmoLink.removeLink.useMutation({
    onSuccess: () => {
      setOpen(false);
      utils.cosmoLink.myList.invalidate();
    },
  });
  return (
    <>
      {children?.({
        open: () => {
          setOpen(true);
        },
      })}
      <Modal.Content role="alertdialog" isOpen={open} onOpenChange={setOpen}>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            removeLink.mutate(address);
          }}
        >
          <Modal.Header>
            <Modal.Title>Delete list</Modal.Title>
            <Modal.Description>
              This will permanently unlink your COSMO ID from this account.
              Continue?
            </Modal.Description>
          </Modal.Header>
          <Modal.Footer>
            <Modal.Close>Cancel</Modal.Close>
            <Button
              intent="danger"
              type="submit"
              isPending={removeLink.isPending}
            >
              Continue
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Content>
    </>
  );
}
