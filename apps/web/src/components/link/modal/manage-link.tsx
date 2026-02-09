"use client";

import { QueryErrorResetBoundary, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ofetch } from "ofetch";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Cropper, type CropperRef } from "react-advanced-cropper";
import { Form } from "react-aria-components";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import ErrorFallbackRender from "@/components/error-boundary";

import "react-advanced-cropper/dist/style.css";
import Portal from "@/components/portal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Description, Label } from "@/components/ui/field";
import { FileTrigger } from "@/components/ui/file-trigger";
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
import { orpc } from "@/lib/orpc/client";
import { mimeTypes, SITE_NAME, validColumns } from "@/lib/utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type RemoveLinkModalProps = {
  address: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function RemoveLinkModal({ address, open, setOpen }: RemoveLinkModalProps) {
  const t = useTranslations("link.unlink");
  const tCommon = useTranslations("common.modal");

  const removeLink = useMutation(
    orpc.cosmoLink.removeLink.mutationOptions({
      onSuccess: (_, _v, _o, { client }) => {
        setOpen(false);
        toast.success(t("success"));
        void client.invalidateQueries({
          queryKey: orpc.profile.list.key(),
        });
      },
      onError: () => {
        toast.error(t("error"));
      },
    }),
  );
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{t("title")}</ModalTitle>
        <ModalDescription>{t("description")}</ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>{tCommon("cancel")}</ModalClose>
        <Button
          intent="danger"
          type="submit"
          isPending={removeLink.isPending}
          onPress={() => removeLink.mutate(address)}
        >
          {t("submit")}
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
  const t = useTranslations("profile.edit");
  const tCommon = useTranslations("common.modal");

  return (
    <SheetContent className={"sm:max-w-md"} isOpen={open} onOpenChange={setOpen}>
      <SheetHeader>
        <SheetTitle>{t("title")}</SheetTitle>
        <SheetDescription>
          {t.rich("desc", {
            bold: (chunks) => <span className="text-fg">{chunks}</span>,
            nickname,
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
                <EditProfileForm address={address} setOpen={setOpen} />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </SheetBody>
      <SheetFooter id="submit-form">
        <SheetClose>{tCommon("cancel")}</SheetClose>
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
  const t = useTranslations("profile.edit");

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
          {t("banner_selected", { name: droppedImage.name })}
        </span>
        <Button size="xs" intent="outline" onPress={onClear}>
          {t("banner_clear")}
        </Button>
      </div>
    </>
  );
}

function EditProfileForm({ address, setOpen }: EditProfileProps) {
  const router = useRouter();
  const cropperRef = useRef<CropperRef>(null);
  const [droppedImage, setDroppedImage] = useState<File | null>(null);
  const t = useTranslations("profile.edit");

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
        toast.success(t("success"));
        router.refresh();
      },
      onError: () => {
        toast.error(t("error"));
      },
    }),
  );

  const getPresignedPost = useMutation(
    orpc.profile.getPresignedPost.mutationOptions({
      onError: () => {
        toast.error(t("upload_error"));
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
          formData.append(key, value);
        });
        formData.append("file", file);

        const response = await ofetch.raw(url, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(t("upload_error"));
        }
      } catch {
        throw new Error(t("upload_error"));
      }
    },
    [],
  );

  const handleSelectImage = useCallback(
    (e: FileList | null) => {
      const files = Array.from(e ?? []);
      const item = files[0];
      if (!item) return;

      if (item.size > MAX_FILE_SIZE) {
        toast.error(t("file_too_large", { name: item.name }));
        return;
      }

      setDroppedImage(item);
    },
    [t],
  );

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
        toast.error(t("upload_error"));
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
              <Label>{t("hide_user_label")}</Label>
              <Description>{t("hide_user_desc", { siteName: SITE_NAME })}</Description>
            </Checkbox>
          )}
        />
        <Controller
          control={control}
          name="hideNickname"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
              <Label>{t("hide_nickname_label")}</Label>
              <Description>{t("hide_nickname_desc")}</Description>
            </Checkbox>
          )}
        />
        <Controller
          control={control}
          name="privateSerial"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
              <Label>{t("private_serial_label")}</Label>
              <Description>{t("private_serial_desc")}</Description>
            </Checkbox>
          )}
        />
        <Controller
          control={control}
          name="hideTransfer"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
              <Label>{t("hide_transfer_label")}</Label>
              <Description>{t("hide_transfer_desc")}</Description>
            </Checkbox>
          )}
        />
        <Controller
          control={control}
          name="privateProfile"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
              <Label>{t("private_profile_label")}</Label>
              <Description>{t("private_profile_desc")}</Description>
            </Checkbox>
          )}
        />

        <Controller
          control={control}
          name="gridColumns"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Select
              aria-label={t("grid_columns_label")}
              placeholder={t("grid_columns_label")}
              name={name}
              value={`${value}`}
              onChange={(key) => onChange(Number(key))}
              onBlur={onBlur}
            >
              <Label>{t("grid_columns_label")}</Label>
              <Description>{t("grid_columns_desc")}</Description>
              <SelectTrigger className="w-[150px]" />
              <SelectContent>
                {[
                  { id: 0, name: t("grid_columns_not_set") },
                  ...validColumns.map((a) => ({
                    id: a,
                    name: t("grid_columns_count", { count: String(a) }),
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
          <Label>{t("banner_label")}</Label>
          <FileTrigger
            acceptedFileTypes={[...new Set(Object.values(mimeTypes))]}
            onSelect={handleSelectImage}
          />
          <BannerImage
            droppedImage={droppedImage}
            cropperRef={cropperRef}
            onClear={() => setDroppedImage(null)}
          />
          <span className="text-muted-fg text-sm">{t("banner_recommendation")}</span>
        </div>
        <Controller
          control={control}
          name="removeBanner"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
              <Label>{t("remove_banner_label")}</Label>
            </Checkbox>
          )}
        />
        <span className="text-muted-fg text-sm">
          {t.rich("unlink_note", {
            link: (chunks) => (
              <Link href="/link" className="underline">
                {chunks}
              </Link>
            ),
          })}
        </span>

        <Portal to="#submit-form">
          <Button intent="primary" isPending={isSubmitting} onPress={() => onSubmit()}>
            {t("submit")}
          </Button>
        </Portal>
      </div>
    </Form>
  );
}
