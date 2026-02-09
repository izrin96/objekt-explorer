"use client";

import { TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { QueryErrorResetBoundary, useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { Form } from "react-aria-components";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import type { User } from "@/lib/server/auth";

import ErrorFallbackRender from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
} from "@/components/ui/disclosure-group";
import { Description, FieldError, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/loader";
import {
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import {
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { useSession } from "@/hooks/use-user";
import { authClient } from "@/lib/auth-client";

import { ListAccounts } from "./link-account";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export default function UserAccountModal({ open, setOpen }: Props) {
  const t = useTranslations("auth.account");
  return (
    <SheetContent className={"sm:max-w-md"} isOpen={open} onOpenChange={setOpen}>
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
                  <div className="flex justify-center py-2">
                    <Loader variant="ring" />
                  </div>
                }
              >
                <div className="flex flex-col gap-9">
                  <UserAccount setOpen={setOpen} />
                  <div className="flex">
                    <DeleteAccount />
                  </div>
                </div>
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </SheetBody>
    </SheetContent>
  );
}

function UserAccount({ setOpen }: { setOpen: (val: boolean) => void }) {
  const { data: session } = useSession();
  const t = useTranslations("auth.account");

  if (!session) return;

  return (
    <DisclosureGroup
      defaultExpandedKeys="1"
      className="[--disclosure-collapsed-bg:transparent] [--disclosure-collapsed-border:transparent] [--disclosure-gutter-x:--spacing(3)]"
    >
      <Disclosure id="1">
        <DisclosureTrigger>{t("general")}</DisclosureTrigger>
        <DisclosurePanel>
          <UserAccountForm user={session.user} setOpen={setOpen} />
        </DisclosurePanel>
      </Disclosure>

      <Disclosure>
        <DisclosureTrigger>{t("change_email")}</DisclosureTrigger>
        <DisclosurePanel>
          <ChangeEmail email={session.user.email} />
        </DisclosurePanel>
      </Disclosure>

      <Disclosure>
        <DisclosureTrigger>{t("change_password")}</DisclosureTrigger>
        <DisclosurePanel>
          <ChangePassword />
        </DisclosurePanel>
      </Disclosure>

      <Disclosure>
        <DisclosureTrigger>{t("social_link")}</DisclosureTrigger>
        <DisclosurePanel>
          <ListAccounts />
        </DisclosurePanel>
      </Disclosure>
    </DisclosureGroup>
  );
}

function UserAccountForm({ user, setOpen }: { user: User; setOpen: (val: boolean) => void }) {
  const router = useRouter();
  const t = useTranslations("auth.account");

  const values = {
    name: user.name,
    showSocial: user.showSocial ?? false,
    removePic: false,
  };

  const { handleSubmit, control } = useForm({
    defaultValues: values,
    values: values,
  });

  const mutation = useMutation({
    mutationFn: async (data: { showSocial: boolean; name: string; image: undefined | null }) => {
      const result = await authClient.updateUser(data);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: async (_, _v, _o, { client }) => {
      setOpen(false);
      void client.refetchQueries({
        queryKey: ["session"],
      });
      router.refresh();
      toast.success(t("account_updated"));
    },
    onError: ({ message }) => {
      toast.error(`${t("account_update_error")}. ${message}`);
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({
      name: data.name,
      showSocial: data.showSocial,
      image: data.removePic ? null : undefined,
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
          name="showSocial"
          render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid } }) => (
            <Checkbox
              name={name}
              onChange={onChange}
              onBlur={onBlur}
              isSelected={value}
              isInvalid={invalid}
            >
              <Label>{t("show_social_label")}</Label>
              <Description>{t("show_social_desc")}</Description>
            </Checkbox>
          )}
        />

        <Controller
          control={control}
          name="removePic"
          render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid } }) => (
            <Checkbox
              name={name}
              onChange={onChange}
              onBlur={onBlur}
              isSelected={value}
              isInvalid={invalid}
            >
              <Label>{t("remove_profile_picture")}</Label>
            </Checkbox>
          )}
        />

        <span className="text-muted-fg text-xs">{t("profile_pic_help")}</span>

        <div className="flex">
          <Button size="md" intent="primary" type="submit" isPending={mutation.isPending}>
            {t("save")}
          </Button>
        </div>
      </div>
    </Form>
  );
}

function ChangePassword() {
  const t = useTranslations("auth.account");
  const { handleSubmit, control } = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const result = await authClient.changePassword(data);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      toast.success(t("password_changed"));
    },
    onError: ({ message }) => {
      toast.error(`${t("password_change_error")}. ${message}`);
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  });

  return (
    <Form onSubmit={onSubmit}>
      <div className="flex flex-col gap-3">
        <Controller
          control={control}
          name="currentPassword"
          rules={{
            required: t("current_password_required"),
          }}
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <TextField
              className="w-full"
              isRequired
              name={name}
              type="password"
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isInvalid={invalid}
            >
              <Label>{t("current_password_label")}</Label>
              <Input placeholder={t("current_password_placeholder")} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />

        <Controller
          control={control}
          name="newPassword"
          rules={{
            required: t("new_password_required"),
            minLength: {
              value: 8,
              message: t("password_min_length"),
            },
          }}
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <TextField
              className="w-full"
              isRequired
              name={name}
              type="password"
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isInvalid={invalid}
            >
              <Label>{t("new_password_label")}</Label>
              <Input placeholder={t("new_password_placeholder")} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />

        <div className="flex">
          <Button
            isDisabled={mutation.isPending}
            size="md"
            intent="primary"
            className="flex-none"
            type="submit"
          >
            {t("save")}
          </Button>
        </div>
      </div>
    </Form>
  );
}

function ChangeEmail({ email }: { email: string }) {
  const t = useTranslations("auth.account");
  const { handleSubmit, control } = useForm({
    defaultValues: {
      email,
    },
    values: {
      email,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: { newEmail: string }) => {
      const result = await authClient.changeEmail(data);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      toast.success(t("email_verification_sent"));
    },
    onError: ({ message }) => {
      toast.error(`${t("email_verification_error")}. ${message}`);
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({
      newEmail: data.email,
    });
  });

  return (
    <Form onSubmit={onSubmit}>
      <div className="flex flex-col gap-3">
        <Controller
          control={control}
          name="email"
          rules={{
            required: t("email_required"),
          }}
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <TextField
              className="w-full"
              isRequired
              name={name}
              type="email"
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isInvalid={invalid}
            >
              <Label>{t("email_label")}</Label>
              <Input placeholder={t("email_placeholder")} />
              <Description>{t("email_verification_desc")}</Description>
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />

        <div className="flex">
          <Button
            isDisabled={mutation.isPending}
            size="md"
            intent="primary"
            className="flex-none"
            type="submit"
          >
            {t("save")}
          </Button>
        </div>
      </div>
    </Form>
  );
}

function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("auth.account");
  const tCommon = useTranslations("common.modal");
  const mutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.deleteUser();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      setOpen(false);
      toast.success(t("verification_email_sent"));
    },
    onError: ({ message }) => {
      toast.error(`${t("delete_account_error")}. ${message}`);
    },
  });

  return (
    <>
      <Button intent="danger" size="sm" onPress={() => setOpen(true)}>
        <TrashSimpleIcon data-slot="icon" />
        {t("delete_account")}
      </Button>
      <ModalContent isOpen={open} onOpenChange={setOpen}>
        <ModalHeader>
          <ModalTitle>{t("delete_account")}</ModalTitle>
          <ModalDescription>{t("delete_account_description")}</ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <ModalClose>{tCommon("cancel")}</ModalClose>
          <Button
            intent="danger"
            type="submit"
            isPending={mutation.isPending}
            onPress={() => mutation.mutate()}
          >
            {t("continue")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </>
  );
}
