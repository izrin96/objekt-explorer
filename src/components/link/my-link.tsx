"use client";

import { api } from "@/lib/trpc/client";
import React, { useState } from "react";
import {
  Button,
  buttonStyles,
  Card,
  Checkbox,
  Form,
  Link,
  Loader,
  Menu,
  Modal,
  Sheet,
  TextField,
} from "../ui";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-boundary";
import { IconDotsVertical } from "@intentui/icons";
import { toast } from "sonner";

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
          <Card key={link.address} className="bg-secondary/20">
            <Card.Content className="flex justify-between">
              <Link
                href={`/@${link.nickname ?? link.address}`}
                className="font-semibold text-base flex-1 flex flex-col gap-1 min-w-0"
              >
                <span className="text-lg truncate">
                  {link.nickname ?? link.address}
                </span>
                <span className="text-muted-fg text-xs truncate">
                  {link.address}
                </span>
              </Link>
              <RemoveLink address={link.address}>
                {({ open: openUnlink }) => (
                  <EditProfile address={link.address} nickname={link.nickname}>
                    {({ open: openEdit }) => (
                      <Menu>
                        <Button intent="outline" size="extra-small">
                          <IconDotsVertical />
                        </Button>
                        <Menu.Content className="sm:min-w-56">
                          <Menu.Item
                            href={`/@${link.nickname ?? link.address}`}
                          >
                            Open
                          </Menu.Item>
                          <Menu.Item onAction={openEdit}>Edit</Menu.Item>
                          <Menu.Item isDanger onAction={openUnlink}>
                            Unlink
                          </Menu.Item>
                        </Menu.Content>
                      </Menu>
                    )}
                  </EditProfile>
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
      utils.profile.getAll.invalidate();
    },
    onError: () => {
      toast.error("Error unlink cosmo");
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
            <Modal.Title>Unlink Cosmo</Modal.Title>
            <Modal.Description>
              This will unlink your Cosmo from this account. You can link it
              again later. Continue?
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

function EditProfile({
  nickname,
  address,
  children,
}: {
  nickname: string;
  address: string;
  children: ({ open }: { open: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const query = api.profile.get.useQuery(address);
  const utils = api.useUtils();
  const edit = api.profile.edit.useMutation({
    onSuccess: () => {
      setOpen(false);
      utils.profile.get.invalidate(address);
      toast.success("Cosmo profile updated");
    },
    onError: ({ message }) => {
      toast.error(message || "Error edit Cosmo profile");
    },
  });

  return (
    <>
      {children?.({
        open: () => {
          setOpen(true);
        },
      })}
      <Sheet.Content isOpen={open} onOpenChange={setOpen}>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);

            edit.mutate({
              address: address,
              hideUser: formData.get("hideUser") === "on",
              bannerImgUrl: (formData.get("bannerImgUrl") as string) || null,
            });
          }}
        >
          <Sheet.Header>
            <Sheet.Title>Edit Profile</Sheet.Title>
            <Sheet.Description>
              Currently edit Cosmo profile: {nickname}
            </Sheet.Description>
          </Sheet.Header>
          <Sheet.Body>
            {query.isLoading ? (
              <div className="flex justify-center">
                <Loader variant="ring" />
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <Checkbox
                  label="Private profile"
                  name="hideUser"
                  description="Hide your Discord from Cosmo profile"
                  defaultSelected={query.data?.hideUser ?? false}
                />
                <TextField
                  description="Display a custom banner image, GIF, or video. The link must start with 'https://'. Upload functionality will be added in the future."
                  label="Banner Image URL"
                  placeholder="https://"
                  name="bannerImgUrl"
                  defaultValue={query.data?.bannerImgUrl ?? ""}
                />
              </div>
            )}
          </Sheet.Body>
          <Sheet.Footer>
            <Button intent="primary" type="submit" isPending={edit.isPending}>
              Save
            </Button>
          </Sheet.Footer>
        </Form>
      </Sheet.Content>
    </>
  );
}
