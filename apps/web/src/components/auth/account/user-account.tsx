"use client";

import { TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { QueryErrorResetBoundary, useMutation } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { Form } from "react-aria-components";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

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
import type { User } from "@/lib/server/auth";

import { ListAccounts } from "./link-account";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export default function UserAccountModal({ open, setOpen }: Props) {
  const content = useIntlayer("auth");
  return (
    <SheetContent className={"sm:max-w-md"} isOpen={open} onOpenChange={setOpen}>
      <SheetHeader>
        <SheetTitle>{content.account.title.value}</SheetTitle>
        <SheetDescription>{content.account.description.value}</SheetDescription>
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
  const content = useIntlayer("auth");

  if (!session) return;

  return (
    <DisclosureGroup
      defaultExpandedKeys="1"
      className="[--disclosure-collapsed-bg:transparent] [--disclosure-collapsed-border:transparent] [--disclosure-gutter-x:--spacing(3)]"
    >
      <Disclosure id="1">
        <DisclosureTrigger>{content.account.general.value}</DisclosureTrigger>
        <DisclosurePanel>
          <UserAccountForm user={session.user} setOpen={setOpen} />
        </DisclosurePanel>
      </Disclosure>

      <Disclosure>
        <DisclosureTrigger>{content.account.change_email.value}</DisclosureTrigger>
        <DisclosurePanel>
          <ChangeEmail email={session.user.email} />
        </DisclosurePanel>
      </Disclosure>

      <Disclosure>
        <DisclosureTrigger>{content.account.change_password.value}</DisclosureTrigger>
        <DisclosurePanel>
          <ChangePassword />
        </DisclosurePanel>
      </Disclosure>

      <Disclosure>
        <DisclosureTrigger>{content.account.social_link.value}</DisclosureTrigger>
        <DisclosurePanel>
          <ListAccounts />
        </DisclosurePanel>
      </Disclosure>
    </DisclosureGroup>
  );
}

function UserAccountForm({ user, setOpen }: { user: User; setOpen: (val: boolean) => void }) {
  const router = useRouter();
  const content = useIntlayer("auth");
  const commonContent = useIntlayer("common");

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
      void client.invalidateQueries({
        queryKey: ["session"],
      });
      router.refresh();
      toast.success(content.account.account_updated.value);
    },
    onError: ({ message }) => {
      toast.error(`${content.account.account_update_error.value}. ${message}`);
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
    <Form onSubmit={onSubmit} validationBehavior="aria">
      <div className="flex flex-col gap-6">
        <Controller
          control={control}
          name="name"
          rules={{
            required: commonContent.validation.required_name.value,
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
              validationBehavior="aria"
            >
              <Label>{content.account.name_label.value}</Label>
              <Input placeholder={content.account.name_placeholder.value} />
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
              validationBehavior="aria"
            >
              <Label>{content.account.show_social_label.value}</Label>
              <Description>{content.account.show_social_desc.value}</Description>
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
              validationBehavior="aria"
            >
              <Label>{content.account.remove_profile_picture.value}</Label>
            </Checkbox>
          )}
        />

        <span className="text-muted-fg text-xs">{content.account.profile_pic_help.value}</span>

        <div className="flex">
          <Button size="md" intent="primary" type="submit" isPending={mutation.isPending}>
            {content.account.save.value}
          </Button>
        </div>
      </div>
    </Form>
  );
}

function ChangePassword() {
  const content = useIntlayer("auth");
  const commonContent = useIntlayer("common");
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
      toast.success(content.account.password_changed.value);
    },
    onError: ({ message }) => {
      toast.error(`${content.account.password_change_error.value}. ${message}`);
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  });

  return (
    <Form onSubmit={onSubmit} validationBehavior="aria">
      <div className="flex flex-col gap-3">
        <Controller
          control={control}
          name="currentPassword"
          rules={{
            required: commonContent.validation.required_password.value,
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
              validationBehavior="aria"
            >
              <Label>{content.account.current_password_label.value}</Label>
              <Input placeholder={content.account.current_password_placeholder.value} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />

        <Controller
          control={control}
          name="newPassword"
          rules={{
            required: commonContent.validation.required_password.value,
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
              validationBehavior="aria"
            >
              <Label>{content.account.new_password_label.value}</Label>
              <Input placeholder={content.account.new_password_placeholder.value} />
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
            {content.account.save.value}
          </Button>
        </div>
      </div>
    </Form>
  );
}

function ChangeEmail({ email }: { email: string }) {
  const content = useIntlayer("auth");
  const commonContent = useIntlayer("common");
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
      toast.success(content.account.email_verification_sent.value);
    },
    onError: ({ message }) => {
      toast.error(`${content.account.email_verification_error.value}. ${message}`);
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({
      newEmail: data.email,
    });
  });

  return (
    <Form onSubmit={onSubmit} validationBehavior="aria">
      <div className="flex flex-col gap-3">
        <Controller
          control={control}
          name="email"
          rules={{
            required: commonContent.validation.required_email.value,
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
              validationBehavior="aria"
            >
              <Label>{content.account.email_label.value}</Label>
              <Input placeholder={content.account.email_placeholder.value} />
              <Description>{content.account.email_verification_desc.value}</Description>
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
            {content.account.save.value}
          </Button>
        </div>
      </div>
    </Form>
  );
}

function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const content = useIntlayer("auth");
  const contentCommon = useIntlayer("common");
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
      toast.success(content.account.verification_email_sent.value);
    },
    onError: ({ message }) => {
      toast.error(`${content.account.delete_account_error.value}. ${message}`);
    },
  });

  return (
    <>
      <Button intent="danger" size="sm" onPress={() => setOpen(true)}>
        <TrashSimpleIcon data-slot="icon" />
        {content.account.delete_account.value}
      </Button>
      <ModalContent isOpen={open} onOpenChange={setOpen}>
        <ModalHeader>
          <ModalTitle>{content.account.delete_account.value}</ModalTitle>
          <ModalDescription>{content.account.delete_account_description.value}</ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <ModalClose>{contentCommon.modal.cancel.value}</ModalClose>
          <Button
            intent="danger"
            type="submit"
            isPending={mutation.isPending}
            onPress={() => mutation.mutate()}
          >
            {content.account.continue.value}
          </Button>
        </ModalFooter>
      </ModalContent>
    </>
  );
}
