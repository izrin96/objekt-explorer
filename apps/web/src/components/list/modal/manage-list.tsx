"use client";

import { QueryErrorResetBoundary, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { Form } from "react-aria-components";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import ErrorFallbackRender from "@/components/error-boundary";
import Portal from "@/components/portal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Description, FieldError, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link } from "@/components/ui/link";
import { Loader } from "@/components/ui/loader";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Radio, RadioGroup } from "@/components/ui/radio";
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
import { TextField } from "@/components/ui/text-field";
import { useUserProfiles } from "@/hooks/use-user";
import { orpc } from "@/lib/orpc/client";
import { parseNickname, SITE_NAME, validColumns } from "@/lib/utils";

type CreateListModalProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function CreateListModal({ open, setOpen }: CreateListModalProps) {
  const t = useTranslations("list.create");
  const tCommon = useTranslations("common.modal");
  const { data: profiles } = useUserProfiles();
  const { handleSubmit, control, watch } = useForm({
    defaultValues: {
      name: "",
      hideUser: true,
      listType: "normal" as "normal" | "profile",
      profileAddress: "",
    },
  });

  const watchedListType = watch("listType");

  const createList = useMutation(
    orpc.list.create.mutationOptions({
      onSuccess: (_, _v, _o, { client }) => {
        setOpen(false);
        toast.success(t("success"));
        return client.invalidateQueries({
          queryKey: orpc.list.list.key(),
        });
      },
      onError: () => {
        toast.error(t("error"));
      },
    }),
  );

  const onSubmit = handleSubmit((data) => {
    createList.mutate({
      name: data.name,
      hideUser: data.hideUser,
      listType: data.listType,
      profileAddress: data.profileAddress || undefined,
    });
  });

  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{t("title")}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <Form onSubmit={onSubmit}>
          <div className="flex flex-col gap-6">
            <Controller
              control={control}
              name="name"
              rules={{
                required: t("name_required"),
              }}
              render={({
                field: { name, value, onChange, onBlur },
                fieldState: { invalid, error },
              }) => (
                <TextField
                  isRequired
                  autoFocus
                  name={name}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  isInvalid={invalid}
                >
                  <Label>{t("name_label")}</Label>
                  <Input placeholder={t("name_placeholder")} />
                  <FieldError>{error?.message}</FieldError>
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="listType"
              render={({ field: { name, value, onChange } }) => (
                <RadioGroup name={name} value={value} onChange={onChange}>
                  <Label>{t("list_type_label")}</Label>
                  <Description>{t("list_type_desc")}</Description>
                  <Radio value="normal">
                    <Label>{t("normal_list_label")}</Label>
                    <Description>{t("normal_list_desc")}</Description>
                  </Radio>
                  <Radio value="profile">
                    <Label>{t("profile_list_label")}</Label>
                    <Description>{t("profile_list_desc")}</Description>
                  </Radio>
                </RadioGroup>
              )}
            />
            {(watchedListType === "profile" || watchedListType === "normal") && (
              <Controller
                control={control}
                name="profileAddress"
                rules={{
                  required: watchedListType === "profile" ? t("profile_required") : false,
                }}
                render={({
                  field: { name, value, onChange, onBlur },
                  fieldState: { invalid, error },
                }) => (
                  <Select
                    aria-label={t("profile_label")}
                    placeholder={t("profile_placeholder")}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    isInvalid={invalid}
                  >
                    <Label>{t("profile_label")}</Label>
                    <Description>
                      {watchedListType === "profile"
                        ? t("profile_desc")
                        : t("display_profile_desc")}
                    </Description>
                    <SelectTrigger />
                    <SelectContent>
                      {watchedListType === "normal" && (
                        <SelectItem id="" textValue={t("display_profile_none")}>
                          {t("display_profile_none")}
                        </SelectItem>
                      )}
                      {profiles?.map((profile) => (
                        <SelectItem
                          key={profile.address.toLowerCase()}
                          id={profile.address.toLowerCase()}
                          textValue={parseNickname(profile.address, profile.nickname)}
                        >
                          {parseNickname(profile.address, profile.nickname)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                    <FieldError>{error?.message}</FieldError>
                  </Select>
                )}
              />
            )}
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
          </div>
        </Form>
      </ModalBody>
      <ModalFooter>
        <ModalClose>{tCommon("cancel")}</ModalClose>
        <Button type="submit" isPending={createList.isPending} onPress={() => onSubmit()}>
          {t("submit")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

type DeleteListModalProps = {
  slug: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function DeleteListModal({ slug, open, setOpen }: DeleteListModalProps) {
  const t = useTranslations("list.delete");
  const tCommon = useTranslations("common.modal");
  const deleteList = useMutation(
    orpc.list.delete.mutationOptions({
      onSuccess: (_, _v, _o, { client }) => {
        setOpen(false);
        toast.success(t("success"));
        return client.invalidateQueries({
          queryKey: orpc.list.list.key(),
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
          isPending={deleteList.isPending}
          onPress={() => deleteList.mutate({ slug })}
        >
          {t("submit")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

type EditListModalProps = {
  slug: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function EditListModal({ slug, open, setOpen }: EditListModalProps) {
  const t = useTranslations("list.edit");
  const tCommon = useTranslations("common.modal");
  return (
    <SheetContent className="sm:max-w-sm" isOpen={open} onOpenChange={setOpen}>
      <SheetHeader>
        <SheetTitle>{t("title")}</SheetTitle>
        <SheetDescription>{t("description")}</SheetDescription>
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
                <EditListForm slug={slug} setOpen={setOpen} />
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

function EditListForm({ slug, setOpen }: { slug: string; setOpen: (val: boolean) => void }) {
  const router = useRouter();
  const t = useTranslations("list.edit");
  const { data: profiles } = useUserProfiles();
  const { data } = useSuspenseQuery(
    orpc.list.find.queryOptions({
      input: slug,
      staleTime: 0,
    }),
  );
  const editList = useMutation(
    orpc.list.edit.mutationOptions({
      onSuccess: (_, { slug }, _o, { client }) => {
        setOpen(false);
        toast.success(t("success"));
        router.replace(`/list/${slug}`);
        void client.invalidateQueries({
          queryKey: orpc.list.list.key(),
        });
      },
      onError: () => {
        toast.error(t("error"));
      },
    }),
  );

  const values = {
    name: data.name,
    hideUser: data.hideUser ?? false,
    gridColumns: data.gridColumns ?? 0,
    profileAddress: data.profileAddress ?? "",
  };

  const { handleSubmit, control } = useForm({
    defaultValues: values,
    values: values,
  });

  const onSubmit = handleSubmit((data) => {
    editList.mutate({
      slug,
      name: data.name,
      hideUser: data.hideUser,
      gridColumns: data.gridColumns === 0 ? null : data.gridColumns,
      profileAddress: data.profileAddress === "" ? null : data.profileAddress,
    });
  });

  return (
    <Form onSubmit={onSubmit}>
      <div className="flex flex-col gap-6">
        <Controller
          control={control}
          name="name"
          rules={{
            required: t("name_required"),
          }}
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <TextField
              isRequired
              autoFocus
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isInvalid={invalid}
            >
              <Label>{t("name_label")}</Label>
              <Input placeholder={t("name_placeholder")} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />

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

        {data.listType === "normal" && (
          <Controller
            control={control}
            name="profileAddress"
            render={({
              field: { name, value, onChange, onBlur },
              fieldState: { invalid, error },
            }) => (
              <Select
                aria-label={t("display_profile_label")}
                placeholder={t("display_profile_none")}
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
              >
                <Label>{t("display_profile_label")}</Label>
                <Description>{t("display_profile_desc")}</Description>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem id="" textValue={t("display_profile_none")}>
                    {t("display_profile_none")}
                  </SelectItem>
                  {profiles?.map((profile) => (
                    <SelectItem
                      key={profile.address.toLowerCase()}
                      id={profile.address.toLowerCase()}
                      textValue={parseNickname(profile.address, profile.nickname)}
                    >
                      {parseNickname(profile.address, profile.nickname)}
                    </SelectItem>
                  ))}
                </SelectContent>
                <FieldError>{error?.message}</FieldError>
              </Select>
            )}
          />
        )}

        <Controller
          control={control}
          name="gridColumns"
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <Select
              aria-label={t("objekt_columns_label")}
              placeholder={t("objekt_columns_label")}
              name={name}
              value={`${value}`}
              onChange={(key) => onChange(Number(key))}
              onBlur={onBlur}
              isInvalid={invalid}
            >
              <Label>{t("objekt_columns_label")}</Label>
              <Description>{t("objekt_columns_desc")}</Description>
              <SelectTrigger className="w-[150px]" />
              <SelectContent>
                {[
                  { id: 0, name: t("objekt_columns_not_set") },
                  ...validColumns.map((a) => ({
                    id: a,
                    name: t("objekt_columns_count", { count: String(a) }),
                  })),
                ].map((item) => (
                  <SelectItem key={item.id} id={`${item.id}`} textValue={item.name}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
              <FieldError>{error?.message}</FieldError>
            </Select>
          )}
        />

        <span className="text-muted-fg text-sm">
          {t.rich("delete_note", {
            link: (chunks) => (
              <Link href="/list" className="underline">
                {chunks}
              </Link>
            ),
          })}
        </span>

        <Portal to="#submit-form">
          <Button isPending={editList.isPending} onPress={() => onSubmit()}>
            {t("submit")}
          </Button>
        </Portal>
      </div>
    </Form>
  );
}
