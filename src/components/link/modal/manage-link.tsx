"use client";

import {
  Button,
  Checkbox,
  FileTrigger,
  Form,
  Label,
  Loader,
  Modal,
  Sheet,
} from "@/components/ui";
import { api } from "@/lib/trpc/client";
import { mimeTypes } from "@/lib/utils";
import { ofetch } from "ofetch";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function RemoveLink({
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
      toast.success("Cosmo unlinked");
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
  const [open, setOpen] = useState(false);

  return (
    <>
      {children?.({
        open: () => {
          setOpen(true);
        },
      })}
      <Sheet.Content isOpen={open} onOpenChange={setOpen}>
        <EditProfileForm
          address={address}
          nickname={nickname}
          onClose={() => setOpen(false)}
          onComplete={onComplete}
        />
      </Sheet.Content>
    </>
  );
}

function EditProfileForm({
  address,
  nickname,
  onClose,
  onComplete,
}: {
  address: string;
  nickname: string;
  onClose: () => void;
  onComplete?: () => void;
}) {
  const [droppedImage, setDroppedImage] = useState<File | null>();
  const [isUploading, startUploadTransition] = useTransition();
  const query = api.profile.get.useQuery(address);
  const utils = api.useUtils();
  const edit = api.profile.edit.useMutation({
    onSuccess: () => {
      onClose();
      setDroppedImage(null);
      utils.profile.get.invalidate(address);
      onComplete?.();
      toast.success("Cosmo profile updated");
    },
    onError: () => {
      toast.error("Error edit Cosmo profile");
    },
  });

  const getPresignedUrl = api.profile.getPresignedUrl.useMutation({
    onError: () => {
      toast.error("Failed to upload image");
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
      } catch {
        toast.error("Failed to upload image");
      }
    },
    [droppedImage, startUploadTransition]
  );
  return (
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
          Currently editing <span className="text-fg">{nickname}</span> Cosmo
          profile
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
              {droppedImage && (
                <span className="text-sm text-muted-fg truncate">
                  Selected file: {droppedImage.name}
                </span>
              )}
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
            query.isPending ||
            edit.isPending ||
            getPresignedUrl.isPending ||
            isUploading
          }
        >
          Save
        </Button>
      </Sheet.Footer>
    </Form>
  );
}
