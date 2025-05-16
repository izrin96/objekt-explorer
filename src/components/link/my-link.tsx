"use client";

import { api } from "@/lib/trpc/client";
import React, { useCallback, useState, useTransition } from "react";
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
  FileTrigger,
  Label,
} from "../ui";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-boundary";
import { IconDotsVertical } from "@intentui/icons";
import { toast } from "sonner";
import { ofetch } from "ofetch";
import { mimeTypes } from "@/lib/utils";

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

export function EditProfile({
  nickname,
  address,
  onComplete,
  children,
}: {
  nickname: string;
  address: string;
  onComplete?: () => void;
  children: ({ open }: { open: () => void }) => React.ReactNode;
}) {
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const [open, setOpen] = useState(false);
  const [droppedImage, setDroppedImage] = useState<File | null>();
  const [isUploading, startUploadTransition] = useTransition();
  const query = api.profile.get.useQuery(address);
  const utils = api.useUtils();

  const edit = api.profile.edit.useMutation({
    onSuccess: () => {
      setOpen(false);
      setDroppedImage(null);
      utils.profile.get.invalidate(address);
      onComplete?.();
      toast.success("Cosmo profile updated");
    },
    onError: ({ message }) => {
      toast.error(message || "Error edit Cosmo profile");
    },
  });

  const getPresignedUrl = api.profile.getPresignedUrl.useMutation({
    onError: () => {
      toast.error("Failed to get upload URL");
    },
  });

  const handleUpload = useCallback(
    async (url: string) => {
      try {
        if (!droppedImage) return;

        startUploadTransition(async () => {
          const response = await ofetch.raw(url, {
            method: "PUT",
            body: droppedImage,
            headers: {
              "Content-Type": droppedImage.type,
            },
          });

          if (!response.ok) {
            throw new Error("Failed to upload image");
          }
        });
      } catch (error) {
        toast.error("Failed to upload image");
      }
    },
    [droppedImage, startUploadTransition]
  );

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
            const hideUser = formData.get("hideUser") === "on";
            const removeBanner = formData.get("removeBanner") === "on";

            if (droppedImage && !removeBanner) {
              getPresignedUrl.mutate(
                { address, fileName: droppedImage.name },
                {
                  onSuccess: async (url) => {
                    await handleUpload(url);

                    // Get the file URL from the presigned URL
                    const fileUrl = url.split("?")[0];
                    edit.mutate({
                      address: address,
                      hideUser: hideUser,
                      bannerImgUrl: fileUrl,
                    });
                  },
                }
              );
              return;
            }

            edit.mutate({
              address: address,
              hideUser: hideUser,
              bannerImgUrl: removeBanner ? null : undefined,
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
                  label="Hide Discord"
                  name="hideUser"
                  description="Hide your Discord from Cosmo profile"
                  defaultSelected={query.data?.hideUser ?? false}
                />
                <div className="group flex flex-col gap-y-1">
                  <Label>Banner Image</Label>
                  <FileTrigger
                    acceptedFileTypes={[...new Set(Object.values(mimeTypes))]}
                    onSelect={(e) => {
                      const files = Array.from(e ?? []);
                      const item = files[0];
                      if (!item) return;

                      if (item.size > MAX_FILE_SIZE) {
                        toast.error(`File "${item.name}" exceeds 10 MB limit.`);
                        return;
                      }

                      setDroppedImage(item);
                    }}
                  />
                </div>
                <Checkbox label="Remove Banner" name="removeBanner" />
              </div>
            )}
          </Sheet.Body>
          <Sheet.Footer>
            <Button
              intent="primary"
              type="submit"
              isPending={
                edit.isPending || getPresignedUrl.isPending || isUploading
              }
            >
              Save
            </Button>
          </Sheet.Footer>
        </Form>
      </Sheet.Content>
    </>
  );
}
