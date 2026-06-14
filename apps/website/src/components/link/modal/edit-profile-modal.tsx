import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { ArrowCounterClockwiseIcon, TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { QueryErrorResetBoundary, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { CropperRef } from "react-advanced-cropper";
import { Cropper } from "react-advanced-cropper";
import { Form } from "react-aria-components/Form";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import "react-advanced-cropper/dist/style.css";
import { Button } from "@/components/intentui/button";
import { Checkbox, CheckboxLabel } from "@/components/intentui/checkbox";
import { Description, Label } from "@/components/intentui/field";
import { FileTrigger } from "@/components/intentui/file-trigger";
import { Link } from "@/components/intentui/link";
import { Loader } from "@/components/intentui/loader";
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
import { acceptedFileMimeTypes, MAX_FILE_SIZE } from "@/lib/file";
import { orpc } from "@/lib/orpc/client";
import { SITE_NAME, validColumns } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export type EditProfileModalProps = {
  nickname: string;
  address: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function EditProfileModal({ nickname, address, open, setOpen }: EditProfileModalProps) {
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
                <EditProfileForm address={address} setOpen={setOpen} />
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
          className="aspect-banner rounded-lg object-cover object-center"
          src={imageUrl}
          autoPlay
          loop
          muted
          playsInline
        />
      ) : ["image/gif"].includes(droppedImage.type) ? (
        <img
          src={imageUrl}
          alt=""
          className="aspect-banner rounded-lg object-cover object-center"
        />
      ) : (
        <div className="h-52">
          <Cropper ref={cropperRef} src={imageUrl} aspectRatio={() => 2.4} />
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

function EditProfileForm({ address, setOpen }: EditProfileProps) {
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
      onSuccess: (_data, _variables, _context, { client }) => {
        setOpen(false);
        setDroppedImage(null);
        toast.success(m.profile_edit_success());
        void client.invalidateQueries({
          queryKey: ["profile"],
        });
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
        headers: {
          "Content-Type": file.type,
          "Content-Length": String(file.size),
        },
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
      const fileToUpload = (await generateCroppedImage()) ?? droppedImage;
      const { url, publicUrl } = await getPresignedPost.mutateAsync({
        address,
        fileName: fileToUpload.name,
        mimeType: fileToUpload.type,
        fileSize: fileToUpload.size,
      });

      try {
        await handleUpload(url, fileToUpload);
      } catch {
        toast.error(m.profile_edit_upload_error());
        return;
      }

      await edit.mutateAsync({
        address: address,
        hideUser: data.hideUser,
        bannerImgUrl: publicUrl,
        bannerImgType: fileToUpload.type,
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
              <CheckboxLabel>{m.profile_edit_hide_user_label()}</CheckboxLabel>
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
              <CheckboxLabel>{m.profile_edit_hide_nickname_label()}</CheckboxLabel>
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
              <CheckboxLabel>{m.profile_edit_private_serial_label()}</CheckboxLabel>
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
              <CheckboxLabel>{m.profile_edit_hide_transfer_label()}</CheckboxLabel>
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
              <CheckboxLabel>{m.profile_edit_private_profile_label()}</CheckboxLabel>
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

        {data.bannerImgUrl ? (
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">{m.profile_edit_remove_banner_label()}</Label>
            <Controller
              control={control}
              name="removeBanner"
              render={({ field: { value, onChange } }) => (
                <div className="flex items-center gap-3">
                  <img
                    src={data.bannerImgUrl ?? undefined}
                    alt=""
                    className={
                      value
                        ? "aspect-banner w-32 rounded-lg object-cover opacity-40"
                        : "aspect-banner w-32 rounded-lg object-cover"
                    }
                  />
                  <div className="flex flex-col gap-1">
                    {value ? (
                      <Button size="sm" intent="outline" onPress={() => onChange(false)}>
                        <ArrowCounterClockwiseIcon />
                        {m.common_actions_undo()}
                      </Button>
                    ) : (
                      <Button size="sm" intent="outline" onPress={() => onChange(true)}>
                        <TrashSimpleIcon />
                        {m.common_actions_remove()}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        ) : null}

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
