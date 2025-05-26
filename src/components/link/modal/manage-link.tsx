"use client";

import ErrorFallbackRender from "@/components/error-boundary";
import {
  Button,
  Checkbox,
  FileTrigger,
  Form,
  Label,
  Link,
  Loader,
  Modal,
  Sheet,
} from "@/components/ui";
import { api } from "@/lib/trpc/client";
import { mimeTypes } from "@/lib/utils";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { Suspense, useCallback, useRef, useState, useTransition } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type RemoveLinkModalProps = {
  address: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function RemoveLinkModal({
  address,
  open,
  setOpen,
}: RemoveLinkModalProps) {
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
    <Modal.Content isOpen={open} onOpenChange={setOpen}>
      <Modal.Header>
        <Modal.Title>Unlink Cosmo</Modal.Title>
        <Modal.Description>
          This will unlink your Cosmo from this account. You can link it again
          later. Continue?
        </Modal.Description>
      </Modal.Header>
      <Modal.Footer>
        <Modal.Close>Cancel</Modal.Close>
        <Button
          intent="danger"
          type="submit"
          isPending={removeLink.isPending}
          onClick={() => removeLink.mutate(address)}
        >
          Continue
        </Button>
      </Modal.Footer>
    </Modal.Content>
  );
}

type EditProfileModalProps = {
  nickname: string;
  address: string;
  onComplete?: () => void;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function EditProfileModal({
  nickname,
  address,
  onComplete,
  open,
  setOpen,
}: EditProfileModalProps) {
  const formRef = useRef<HTMLFormElement>(null!);
  const [droppedImage, setDroppedImage] = useState<File | null>(null);
  const [isUploading, startUploadTransition] = useTransition();

  const utils = api.useUtils();
  const edit = api.profile.edit.useMutation({
    onSuccess: () => {
      setOpen(false);
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
      if (!droppedImage) return;

      try {
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
      } catch {
        toast.error("Failed to upload image");
      }
    },
    [droppedImage]
  );

  const handleSelectImage = useCallback((e: FileList | null) => {
    const files = Array.from(e ?? []);
    const item = files[0];
    if (!item) return;

    if (item.size > MAX_FILE_SIZE) {
      toast.error(`File "${item.name}" exceeds 10 MB limit.`);
      return;
    }

    setDroppedImage(item);
  }, []);

  return (
    <Sheet.Content
      classNames={{ content: "max-w-sm" }}
      isOpen={open}
      onOpenChange={setOpen}
    >
      <Sheet.Header>
        <Sheet.Title>Edit Profile</Sheet.Title>
        <Sheet.Description>
          Currently editing <span className="text-fg">{nickname}</span> Cosmo
          profile
        </Sheet.Description>
      </Sheet.Header>
      <Sheet.Body>
        <Form
          ref={formRef}
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const hideUser = formData.get("hideUser") === "on";
            const removeBanner = formData.get("removeBanner") === "on";
            const privateSerial = formData.get("privateSerial") === "on";
            const privateProfile = formData.get("privateProfile") === "on";

            if (droppedImage && !removeBanner) {
              getPresignedUrl.mutate(
                {
                  address,
                  fileName: droppedImage.name,
                },
                {
                  onSuccess: async (url) => {
                    startUploadTransition(async () => {
                      await handleUpload(url);

                      const fileUrl = url.split("?")[0];
                      edit.mutate({
                        address: address,
                        hideUser,
                        bannerImgUrl: fileUrl,
                        privateSerial,
                        privateProfile,
                      });
                    });
                  },
                }
              );
              return;
            }

            edit.mutate({
              address: address,
              hideUser,
              bannerImgUrl: removeBanner ? null : undefined,
              privateSerial,
              privateProfile,
            });
          }}
        >
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary
                onReset={reset}
                FallbackComponent={ErrorFallbackRender}
              >
                <Suspense
                  fallback={
                    <div className="flex justify-center">
                      <Loader variant="ring" />
                    </div>
                  }
                >
                  <EditProfileForm
                    address={address}
                    droppedImage={droppedImage}
                    handleSelectImage={handleSelectImage}
                  />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </Form>
      </Sheet.Body>
      <Sheet.Footer>
        <Sheet.Close>Cancel</Sheet.Close>
        <Button
          onClick={() => formRef.current.requestSubmit()}
          intent="primary"
          type="submit"
          isPending={edit.isPending || getPresignedUrl.isPending || isUploading}
        >
          Save
        </Button>
      </Sheet.Footer>
    </Sheet.Content>
  );
}

type EditProfileProps = {
  address: string;
  droppedImage: File | null;
  handleSelectImage: (files: FileList | null) => void;
};

function EditProfileForm({
  address,
  droppedImage,
  handleSelectImage,
}: EditProfileProps) {
  const [data] = api.profile.get.useSuspenseQuery(address);
  return (
    <div className="flex flex-col gap-6">
      <Checkbox
        label="Hide User"
        name="hideUser"
        description="Hide Objekt Tracker account from Cosmo profile"
        defaultSelected={data.hideUser ?? false}
      />
      <Checkbox
        label="Hide from Serial Lookup"
        name="privateSerial"
        description="Prevent others from finding your objekt via its serial number. You will still be able to see it."
        defaultSelected={data.privateSerial ?? false}
      />
      <Checkbox
        label="Private Profile"
        name="privateProfile"
        description="Make your Cosmo profile private. Only you will be able to view it."
        defaultSelected={data.privateProfile ?? false}
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
          onSelect={handleSelectImage}
        />
      </div>
      <Checkbox label="Remove Banner" name="removeBanner" />
      <span className="text-muted-fg text-sm">
        To unlink this Cosmo profile from your account, visit{" "}
        <Link href="/link" className="underline">
          Manage Cosmo link
        </Link>{" "}
        page.
      </span>
    </div>
  );
}
