import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { QueryErrorResetBoundary, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { CropperRef } from "react-advanced-cropper";
import { Cropper } from "react-advanced-cropper";
import { Form } from "react-aria-components/Form";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/intentui/button";
import { Checkbox } from "@/components/intentui/checkbox";

import "react-advanced-cropper/dist/style.css";
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
import ErrorFallbackRender from "@/components/router/error-boundary";
import Portal from "@/components/shared/portal";
import { orpc } from "@/lib/orpc/client";
import { acceptedFileMimeTypes, SITE_NAME, validColumns } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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
        toast.success(m.link_unlink_success());
        void client.invalidateQueries({
          queryKey: orpc.user.currentUser.key(),
        });
      },
      onError: () => {
        toast.error(m.link_unlink_error());
      },
    }),
  );
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{m.link_unlink_title()}</ModalTitle>
        <ModalDescription>{m.link_unlink_description()}</ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>{m.common_modal_cancel()}</ModalClose>
        <Button
          intent="danger"
          type="submit"
          isPending={removeLink.isPending}
          onPress={() => removeLink.mutate(address)}
        >
          {m.link_unlink_submit()}
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
  return (
    <SheetContent className="sm:max-w-md" isOpen={open} onOpenChange={setOpen}>
      <SheetHeader>
        <SheetTitle>{m.profile_edit_title()}</SheetTitle>
        <SheetDescription>
          <ParaglideMessage
            message={m.profile_edit_desc}
            inputs={{}}
            markup={{
              nickname: () => <span className="text-fg">{nickname}</span>,
            }}
          />
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
        <SheetClose>{m.common_modal_cancel()}</SheetClose>
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
          {m.profile_edit_banner_selected({ name: droppedImage.name })}
        </span>
        <Button size="xs" intent="outline" onPress={onClear}>
          {m.profile_edit_banner_clear()}
        </Button>
      </div>
    </>
  );
}

function EditProfileForm({ address, setOpen, onSave }: EditProfileProps) {
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
        toast.success(m.profile_edit_success());
        onSave?.();
      },
      onError: () => {
        toast.error(m.profile_edit_error());
      },
    }),
  );

  const getPresignedPost = useMutation(
    orpc.profile.getPresignedPost.mutationOptions({
      onError: () => {
        toast.error(m.profile_edit_upload_error());
      },
      retry: 2,
    }),
  );

  const handleUpload = async (url: string, file: File) => {
    try {
      const response = await ofetch.raw(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!response.ok) {
        throw new Error(m.profile_edit_upload_error());
      }
    } catch {
      throw new Error(m.profile_edit_upload_error());
    }
  };

  const handleSelectImage = (e: FileList | null) => {
    const files = Array.from(e ?? []);
    const item = files[0];
    if (!item) return;

    if (item.size > MAX_FILE_SIZE) {
      toast.error(m.profile_edit_file_too_large({ name: item.name }));
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
      const { url, publicUrl } = await getPresignedPost.mutateAsync({
        address,
        fileName: droppedImage.name,
        mimeType: droppedImage.type,
      });

      try {
        await handleUpload(url, croppedFile ?? droppedImage);
      } catch {
        toast.error(m.profile_edit_upload_error());
        return;
      }

      await edit.mutateAsync({
        address: address,
        hideUser: data.hideUser,
        bannerImgUrl: publicUrl,
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
              <Label>{m.profile_edit_hide_user_label()}</Label>
              <Description>{m.profile_edit_hide_user_desc({ siteName: SITE_NAME })}</Description>
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
              <Label>{m.profile_edit_hide_nickname_label()}</Label>
              <Description>{m.profile_edit_hide_nickname_desc()}</Description>
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
              <Label>{m.profile_edit_private_serial_label()}</Label>
              <Description>{m.profile_edit_private_serial_desc()}</Description>
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
              <Label>{m.profile_edit_hide_transfer_label()}</Label>
              <Description>{m.profile_edit_hide_transfer_desc()}</Description>
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
              <Label>{m.profile_edit_private_profile_label()}</Label>
              <Description>{m.profile_edit_private_profile_desc()}</Description>
            </Checkbox>
          )}
        />

        <Controller
          control={control}
          name="gridColumns"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Select
              aria-label={m.profile_edit_grid_columns_label()}
              placeholder={m.profile_edit_grid_columns_label()}
              name={name}
              value={`${value}`}
              onChange={(key) => onChange(Number(key))}
              onBlur={onBlur}
              validationBehavior="aria"
            >
              <Label>{m.profile_edit_grid_columns_label()}</Label>
              <Description>{m.profile_edit_grid_columns_desc()}</Description>
              <SelectTrigger className="w-[150px]" />
              <SelectContent>
                {[
                  { id: 0, name: m.profile_edit_grid_columns_not_set() },
                  ...validColumns.map((a) => ({
                    id: a,
                    name: m.profile_edit_grid_columns_count({ count: String(a) }),
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
          <Label>{m.profile_edit_banner_label()}</Label>
          <FileTrigger acceptedFileTypes={acceptedFileMimeTypes} onSelect={handleSelectImage} />
          <BannerImage
            droppedImage={droppedImage}
            cropperRef={cropperRef}
            onClear={() => setDroppedImage(null)}
          />
          <span className="text-muted-fg text-sm">{m.profile_edit_banner_recommendation()}</span>
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
              <Label>{m.profile_edit_remove_banner_label()}</Label>
            </Checkbox>
          )}
        />
        <span className="text-muted-fg text-sm">
          <ParaglideMessage
            message={m.profile_edit_unlink_note}
            inputs={{}}
            markup={{
              link: (props) => (
                <Link to="/link" className="underline">
                  {props.children}
                </Link>
              ),
            }}
          />
        </span>

        <Portal to="#submit-form-edit-profile">
          <Button intent="primary" isPending={isSubmitting} onPress={() => onSubmit()}>
            {m.profile_edit_submit()}
          </Button>
        </Portal>
      </div>
    </Form>
  );
}
