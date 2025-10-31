"use client";

import { QueryErrorResetBoundary, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Cropper, type CropperRef } from "react-advanced-cropper";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import ErrorFallbackRender from "@/components/error-boundary";
import { orpc } from "@/lib/orpc/client";
import { mimeTypes, validColumns } from "@/lib/utils";
import "react-advanced-cropper/dist/style.css";
import { useRouter } from "next/navigation";
import Portal from "@/components/portal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Description, Label } from "@/components/ui/field";
import { FileTrigger } from "@/components/ui/file-trigger";
import { Form } from "@/components/ui/form";
import { Link } from "@/components/ui/link";
import { Loader } from "@/components/ui/loader";
import {
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type RemoveLinkModalProps = {
  address: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function RemoveLinkModal({ address, open, setOpen }: RemoveLinkModalProps) {
  const removeLink = useMutation(
    orpc.cosmoLink.removeLink.mutationOptions({
      onSuccess: (_, _v, _o, { client }) => {
        setOpen(false);
        toast.success("Cosmo unlinked");
        client.invalidateQueries({
          queryKey: orpc.profile.list.key(),
        });
      },
      onError: () => {
        toast.error("Error unlink cosmo");
      },
    }),
  );
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>Unlink Cosmo</ModalTitle>
        <ModalDescription>
          This will unlink your Cosmo from this account. You can link it again later. Continue?
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>Cancel</ModalClose>
        <Button
          intent="danger"
          type="submit"
          isPending={removeLink.isPending}
          onClick={() => removeLink.mutate(address)}
        >
          Continue
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

type EditProfileModalProps = {
  nickname: string;
  address: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function EditProfileModal({ nickname, address, open, setOpen }: EditProfileModalProps) {
  return (
    <SheetContent className={"sm:max-w-md"} isOpen={open} onOpenChange={setOpen}>
      <SheetHeader>
        <SheetTitle>Edit Profile</SheetTitle>
        <SheetDescription>
          Currently editing <span className="text-fg">{nickname}</span> Cosmo profile
        </SheetDescription>
      </SheetHeader>
      <SheetBody>
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
                <EditProfileForm address={address} setOpen={setOpen} />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </SheetBody>
      <SheetFooter id="submit-form">
        <SheetClose>Cancel</SheetClose>
      </SheetFooter>
    </SheetContent>
  );
}

type EditProfileProps = {
  address: string;
  setOpen: (val: boolean) => void;
};

type BannerImageProps = {
  droppedImage: File | null;
  cropperRef: React.RefObject<CropperRef | null>;
  onClear: () => void;
};

function BannerImage({ droppedImage, cropperRef, onClear }: BannerImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (droppedImage) {
      const url = URL.createObjectURL(droppedImage);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return undefined;
  }, [droppedImage]);

  if (!droppedImage || !imageUrl) return null;

  return (
    <>
      {droppedImage.type.startsWith("video") ? (
        <video
          src={imageUrl}
          className="aspect-[2.3/1] rounded-lg object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
      ) : ["image/gif"].includes(droppedImage.type) ? (
        <img
          src={imageUrl}
          alt="Selected banner preview"
          className="aspect-[2.3/1] rounded-lg object-cover"
        />
      ) : (
        <div className="h-52">
          <Cropper ref={cropperRef} src={imageUrl} aspectRatio={() => 2.3} />
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="truncate text-muted-fg text-sm">Selected file: {droppedImage.name}</span>
        <Button size="xs" intent="outline" onClick={onClear}>
          Clear
        </Button>
      </div>
    </>
  );
}

function EditProfileForm({ address, setOpen }: EditProfileProps) {
  const router = useRouter();
  const cropperRef = useRef<CropperRef>(null);
  const [droppedImage, setDroppedImage] = useState<File | null>(null);

  const { data } = useSuspenseQuery(
    orpc.profile.find.queryOptions({
      input: address,
      staleTime: 0,
    }),
  );

  const values = {
    hideUser: data.hideUser ?? false,
    hideNickname: data.hideNickname ?? false,
    privateSerial: data.privateSerial ?? false,
    hideTransfer: data.hideTransfer ?? false,
    privateProfile: data.privateProfile ?? false,
    gridColumns: data.gridColumns ?? 0,
    removeBanner: false,
  };

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: values,
    values: values,
  });

  const edit = useMutation(
    orpc.profile.edit.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        setDroppedImage(null);
        toast.success("Cosmo profile updated");
        router.refresh();
      },
      onError: () => {
        toast.error("Error edit Cosmo profile");
      },
    }),
  );

  const getPresignedPost = useMutation(
    orpc.profile.getPresignedPost.mutationOptions({
      onError: () => {
        toast.error("Failed to upload image");
      },
      retry: 2,
    }),
  );

  const handleUpload = useCallback(
    async (url: string, fields: Record<string, string>, file: File) => {
      try {
        const formData = new FormData();
        formData.append("Content-Type", file.type);
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value as string);
        });
        formData.append("file", file);

        const response = await ofetch.raw(url, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }
      } catch {
        throw new Error("Failed to upload image");
      }
    },
    [],
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

  const generateCroppedImage = useCallback(() => {
    if (!cropperRef.current || !droppedImage) return null;

    const canvas = cropperRef.current.getCanvas();
    if (!canvas) return null;

    return new Promise<File | null>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], droppedImage.name, {
            type: droppedImage.type,
          });
          resolve(croppedFile);
        } else {
          resolve(null);
        }
      }, droppedImage.type);
    });
  }, [droppedImage]);

  const onSubmit = handleSubmit(async (data) => {
    if (droppedImage && !data.removeBanner) {
      const croppedFile = await generateCroppedImage();
      const { url, fields, key } = await getPresignedPost.mutateAsync({
        address,
        fileName: droppedImage.name,
        mimeType: droppedImage.type,
      });

      try {
        await handleUpload(url, fields, croppedFile ?? droppedImage);
      } catch {
        toast.error("Failed to upload image");
        return;
      }

      await edit.mutateAsync({
        address: address,
        hideUser: data.hideUser,
        bannerImgUrl: `${url}/${key}`,
        bannerImgType: droppedImage.type,
        privateSerial: data.privateSerial,
        privateProfile: data.privateProfile,
        hideNickname: data.hideNickname,
        hideTransfer: data.hideTransfer,
        gridColumns: data.gridColumns === 0 ? null : data.gridColumns,
      });

      return;
    }

    await edit.mutateAsync({
      address: address,
      hideUser: data.hideUser,
      bannerImgUrl: data.removeBanner ? null : undefined,
      bannerImgType: data.removeBanner ? null : undefined,
      privateSerial: data.privateSerial,
      privateProfile: data.privateProfile,
      hideNickname: data.hideNickname,
      hideTransfer: data.hideTransfer,
      gridColumns: data.gridColumns === 0 ? null : data.gridColumns,
    });
  });

  return (
    <Form onSubmit={onSubmit}>
      <div className="flex flex-col gap-6">
        <Controller
          control={control}
          name="hideUser"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
              <Label>Hide User</Label>
              <Description>Hide Objekt Tracker account from Cosmo profile</Description>
            </Checkbox>
          )}
        />
        <Controller
          control={control}
          name="hideNickname"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
              <Label>Hide Cosmo ID</Label>
              <Description>
                Hide Cosmo ID from Activity, Trade History, Serial Lookup and your profile.
              </Description>
            </Checkbox>
          )}
        />
        <Controller
          control={control}
          name="privateSerial"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
              <Label>Hide from Serial Lookup</Label>
              <Description>
                Prevent others from finding your objekt via serial number. Only you can see it.
              </Description>
            </Checkbox>
          )}
        />
        <Controller
          control={control}
          name="hideTransfer"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
              <Label>Hide Trade History</Label>
              <Description>Hide your profile trade history. Only you can see it.</Description>
            </Checkbox>
          )}
        />
        <Controller
          control={control}
          name="privateProfile"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
              <Label>Private Profile</Label>
              <Description>Make your Cosmo profile private. Only you can see it.</Description>
            </Checkbox>
          )}
        />

        <Controller
          control={control}
          name="gridColumns"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Select
              aria-label="Objekt Columns"
              placeholder="Objekt Columns"
              name={name}
              value={`${value}`}
              onChange={(key) => onChange(Number(key))}
              onBlur={onBlur}
            >
              <Label>Objekt Columns</Label>
              <Description>
                Number of columns to use on visit. Visitor are still allowed to change to any
                columns they want. Pro tips: can also override using URL params (?column=).
              </Description>
              <SelectTrigger className="w-[150px]" />
              <SelectContent>
                {[
                  { id: 0, name: "Not set" },
                  ...validColumns.map((a) => ({ id: a, name: `${a} columns` })),
                ].map((item) => (
                  <SelectItem key={item.id} id={`${item.id}`} textValue={item.name}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />

        <div className="group flex flex-col gap-y-2">
          <Label>Banner Image</Label>
          <FileTrigger
            acceptedFileTypes={[...new Set(Object.values(mimeTypes))]}
            onSelect={handleSelectImage}
          />
          <BannerImage
            droppedImage={droppedImage}
            cropperRef={cropperRef}
            onClear={() => setDroppedImage(null)}
          />
          <span className="text-muted-fg text-sm">Recommended aspect ratio is 2.3:1</span>
        </div>
        <Controller
          control={control}
          name="removeBanner"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
              <Label>Remove Banner</Label>
            </Checkbox>
          )}
        />
        <span className="text-muted-fg text-sm">
          To unlink this Cosmo profile from your account, visit{" "}
          <Link href="/link" className="underline">
            Manage Cosmo link
          </Link>{" "}
          page.
        </span>

        <Portal to="#submit-form">
          <Button intent="primary" isPending={isSubmitting} onClick={onSubmit}>
            Save
          </Button>
        </Portal>
      </div>
    </Form>
  );
}
