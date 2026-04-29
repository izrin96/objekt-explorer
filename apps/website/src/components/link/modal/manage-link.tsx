import { QueryErrorResetBoundary, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { CropperRef } from "react-advanced-cropper";
import { Cropper } from "react-advanced-cropper";
import { Form } from "react-aria-components/Form";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { useIntlayer } from "react-intlayer";
import { toast } from "sonner";

import ErrorFallbackRender from "@/components/error-boundary";

import "react-advanced-cropper/dist/style.css";
import { Button } from "@/components/intentui/button";
import { Checkbox } from "@/components/intentui/checkbox";
import { Description, Label } from "@/components/intentui/field";
import { FileTrigger } from "@/components/intentui/file-trigger";
import { Link } from "@/components/intentui/link";
import { Loader } from "@/components/intentui/loader";
import {
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/intentui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/intentui/select";
import {
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/intentui/sheet";
import Portal from "@/components/portal";
import { orpc } from "@/lib/orpc/client";
import { acceptedFileMimeTypes, SITE_NAME, validColumns } from "@/lib/utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type RemoveLinkModalProps = {
  address: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function RemoveLinkModal({ address, open, setOpen }: RemoveLinkModalProps) {
  const content = useIntlayer("link");
  const contentCommon = useIntlayer("common");

  const removeLink = useMutation(
    orpc.cosmoLink.removeLink.mutationOptions({
      onSuccess: (_, _v, _o, { client }) => {
        setOpen(false);
        toast.success(content.unlink.success.value);
        void client.invalidateQueries({
          queryKey: orpc.profile.list.key(),
        });
      },
      onError: () => {
        toast.error(content.unlink.error.value);
      },
    }),
  );
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{content.unlink.title.value}</ModalTitle>
        <ModalDescription>{content.unlink.description.value}</ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>{contentCommon.modal.cancel.value}</ModalClose>
        <Button
          intent="danger"
          type="submit"
          isPending={removeLink.isPending}
          onPress={() => removeLink.mutate(address)}
        >
          {content.unlink.submit}
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
  onSave?: () => void;
};

export function EditProfileModal({
  nickname,
  address,
  open,
  setOpen,
  onSave,
}: EditProfileModalProps) {
  const content = useIntlayer("profile");
  const contentCommon = useIntlayer("common");

  return (
    <SheetContent className="sm:max-w-md" isOpen={open} onOpenChange={setOpen}>
      <SheetHeader>
        <SheetTitle>{content.edit.title.value}</SheetTitle>
        <SheetDescription>
          {content.edit.desc.use({
            nickname: () => <span className="text-fg">{nickname}</span>,
          })}
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
                <EditProfileForm address={address} setOpen={setOpen} onSave={onSave} />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </SheetBody>
      <SheetFooter id="submit-form-edit-profile">
        <SheetClose>{contentCommon.modal.cancel.value}</SheetClose>
      </SheetFooter>
    </SheetContent>
  );
}

type EditProfileProps = {
  address: string;
  setOpen: (val: boolean) => void;
  onSave?: () => void;
};

type BannerImageProps = {
  droppedImage: File | null;
  cropperRef: React.RefObject<CropperRef | null>;
  onClear: () => void;
};

function BannerImage({ droppedImage, cropperRef, onClear }: BannerImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const content = useIntlayer("profile");

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
          className="aspect-[2.3/1] rounded-lg object-cover"
          src={imageUrl}
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
        <span className="text-muted-fg truncate text-sm">
          {content.edit.banner_selected({ name: droppedImage.name }).value}
        </span>
        <Button size="xs" intent="outline" onPress={onClear}>
          {content.edit.banner_clear.value}
        </Button>
      </div>
    </>
  );
}

function EditProfileForm({ address, setOpen, onSave }: EditProfileProps) {
  const cropperRef = useRef<CropperRef>(null);
  const [droppedImage, setDroppedImage] = useState<File | null>(null);
  const content = useIntlayer("profile");

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
        toast.success(content.edit.success.value);
        onSave?.();
      },
      onError: () => {
        toast.error(content.edit.error.value);
      },
    }),
  );

  const getPresignedPost = useMutation(
    orpc.profile.getPresignedPost.mutationOptions({
      onError: () => {
        toast.error(content.edit.upload_error.value);
      },
      retry: 2,
    }),
  );

  const handleUpload = async (url: string, fields: Record<string, string>, file: File) => {
    try {
      const formData = new FormData();
      formData.append("Content-Type", file.type);
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append("file", file);

      const response = await ofetch.raw(url, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(content.edit.upload_error.value);
      }
    } catch {
      throw new Error(content.edit.upload_error.value);
    }
  };

  const handleSelectImage = (e: FileList | null) => {
    const files = Array.from(e ?? []);
    const item = files[0];
    if (!item) return;

    if (item.size > MAX_FILE_SIZE) {
      toast.error(content.edit.file_too_large({ name: item.name }).value);
      return;
    }

    setDroppedImage(item);
  };

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
        toast.error(content.edit.upload_error.value);
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
    <Form onSubmit={onSubmit} validationBehavior="aria">
      <div className="flex flex-col gap-6">
        <Controller
          control={control}
          name="hideUser"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox
              name={name}
              isSelected={value}
              onChange={onChange}
              onBlur={onBlur}
              validationBehavior="aria"
            >
              <Label>{content.edit.hide_user_label.value}</Label>
              <Description>
                {content.edit.hide_user_desc({ siteName: SITE_NAME }).value}
              </Description>
            </Checkbox>
          )}
        />
        <Controller
          control={control}
          name="hideNickname"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox
              name={name}
              isSelected={value}
              onChange={onChange}
              onBlur={onBlur}
              validationBehavior="aria"
            >
              <Label>{content.edit.hide_nickname_label.value}</Label>
              <Description>{content.edit.hide_nickname_desc.value}</Description>
            </Checkbox>
          )}
        />
        <Controller
          control={control}
          name="privateSerial"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox
              name={name}
              isSelected={value}
              onChange={onChange}
              onBlur={onBlur}
              validationBehavior="aria"
            >
              <Label>{content.edit.private_serial_label.value}</Label>
              <Description>{content.edit.private_serial_desc.value}</Description>
            </Checkbox>
          )}
        />
        <Controller
          control={control}
          name="hideTransfer"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox
              name={name}
              isSelected={value}
              onChange={onChange}
              onBlur={onBlur}
              validationBehavior="aria"
            >
              <Label>{content.edit.hide_transfer_label.value}</Label>
              <Description>{content.edit.hide_transfer_desc.value}</Description>
            </Checkbox>
          )}
        />
        <Controller
          control={control}
          name="privateProfile"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox
              name={name}
              isSelected={value}
              onChange={onChange}
              onBlur={onBlur}
              validationBehavior="aria"
            >
              <Label>{content.edit.private_profile_label.value}</Label>
              <Description>{content.edit.private_profile_desc.value}</Description>
            </Checkbox>
          )}
        />

        <Controller
          control={control}
          name="gridColumns"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Select
              aria-label={content.edit.grid_columns_label.value}
              placeholder={content.edit.grid_columns_label.value}
              name={name}
              value={`${value}`}
              onChange={(key) => onChange(Number(key))}
              onBlur={onBlur}
              validationBehavior="aria"
            >
              <Label>{content.edit.grid_columns_label.value}</Label>
              <Description>{content.edit.grid_columns_desc.value}</Description>
              <SelectTrigger className="w-[150px]" />
              <SelectContent>
                {[
                  { id: 0, name: content.edit.grid_columns_not_set.value },
                  ...validColumns.map((a) => ({
                    id: a,
                    name: content.edit.grid_columns_count({ count: String(a) }).value,
                  })),
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
          <Label>{content.edit.banner_label.value}</Label>
          <FileTrigger acceptedFileTypes={acceptedFileMimeTypes} onSelect={handleSelectImage} />
          <BannerImage
            droppedImage={droppedImage}
            cropperRef={cropperRef}
            onClear={() => setDroppedImage(null)}
          />
          <span className="text-muted-fg text-sm">{content.edit.banner_recommendation.value}</span>
        </div>
        <Controller
          control={control}
          name="removeBanner"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox
              name={name}
              isSelected={value}
              onChange={onChange}
              onBlur={onBlur}
              validationBehavior="aria"
            >
              <Label>{content.edit.remove_banner_label.value}</Label>
            </Checkbox>
          )}
        />
        <span className="text-muted-fg text-sm">
          {content.edit.unlink_note.use({
            link: (props) => (
              <Link to="/link" className="underline">
                {props.children}
              </Link>
            ),
          })}
        </span>

        <Portal to="#submit-form-edit-profile">
          <Button intent="primary" isPending={isSubmitting} onPress={() => onSubmit()}>
            {content.edit.submit.value}
          </Button>
        </Portal>
      </div>
    </Form>
  );
}
