import { ArrowCounterClockwiseIcon, TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { QueryErrorResetBoundary, useMutation } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { Form } from "react-aria-components/Form";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Avatar } from "@/components/intentui/avatar-custom";
import { Button } from "@/components/intentui/button";
import { Checkbox } from "@/components/intentui/checkbox";
import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
} from "@/components/intentui/disclosure-group";
import { Description, FieldError, Label } from "@/components/intentui/field";
import { Input } from "@/components/intentui/input";
import { Loader } from "@/components/intentui/loader";
import {
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/intentui/modal";
import {
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/intentui/sheet";
import { TextField } from "@/components/intentui/text-field";
import ErrorFallbackRender from "@/components/router/error-boundary";
import { useCurrentUser } from "@/hooks/use-user";
import { authClient } from "@/lib/auth-client";
import type { User } from "@/lib/server/auth.server";
import { m } from "@/paraglide/messages";

import { ListAccounts } from "./link-account";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export default function UserAccountModal({ open, setOpen }: Props) {
  return (
    <SheetContent className="sm:max-w-md" isOpen={open} onOpenChange={setOpen}>
      <SheetHeader>
        <SheetTitle>{m.auth_account_title()}</SheetTitle>
        <SheetDescription>{m.auth_account_description()}</SheetDescription>
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
  const { data: user } = useCurrentUser();
  if (!user) return null;

  return (
    <DisclosureGroup
      defaultExpandedKeys="1"
      className="[--disclosure-collapsed-bg:transparent] [--disclosure-collapsed-border:transparent] [--disclosure-gutter-x:--spacing(3)]"
    >
      <Disclosure id="1">
        <DisclosureTrigger>{m.auth_account_general()}</DisclosureTrigger>
        <DisclosurePanel>
          <UserAccountForm user={user.user} setOpen={setOpen} />
        </DisclosurePanel>
      </Disclosure>

      <Disclosure>
        <DisclosureTrigger>{m.auth_account_change_email()}</DisclosureTrigger>
        <DisclosurePanel>
          <ChangeEmail email={user.user.email} />
        </DisclosurePanel>
      </Disclosure>

      <Disclosure>
        <DisclosureTrigger>{m.auth_account_change_password()}</DisclosureTrigger>
        <DisclosurePanel>
          <ChangePassword />
        </DisclosurePanel>
      </Disclosure>

      <Disclosure>
        <DisclosureTrigger>{m.auth_account_social_link()}</DisclosureTrigger>
        <DisclosurePanel>
          <ListAccounts />
        </DisclosurePanel>
      </Disclosure>
    </DisclosureGroup>
  );
}

function UserAccountForm({ user, setOpen }: { user: User; setOpen: (val: boolean) => void }) {
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
      void client.invalidateQueries();
      toast.success(m.auth_account_account_updated());
    },
    onError: ({ message }) => {
      toast.error(`${m.auth_account_account_update_error()}. ${message}`);
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
            required: m.common_validation_required_name(),
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
              <Label>{m.auth_account_name_label()}</Label>
              <Input placeholder={m.auth_account_name_placeholder()} />
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
              <Label>{m.auth_account_show_social_label()}</Label>
              <Description>{m.auth_account_show_social_desc()}</Description>
            </Checkbox>
          )}
        />

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">{m.auth_account_remove_profile_picture()}</Label>
          <Controller
            control={control}
            name="removePic"
            render={({ field: { value, onChange } }) => (
              <div className="flex items-center gap-3">
                <Avatar
                  size="xl"
                  src={value ? null : user.image}
                  alt={user.name ?? undefined}
                  initials={(user.name ?? "").charAt(0)}
                  className={value ? "opacity-40" : undefined}
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
          <span className="text-muted-fg text-xs">{m.auth_account_profile_pic_help()}</span>
        </div>

        <div className="flex">
          <Button size="md" intent="primary" type="submit" isPending={mutation.isPending}>
            {m.auth_account_save()}
          </Button>
        </div>
      </div>
    </Form>
  );
}

function ChangePassword() {
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
      toast.success(m.auth_account_password_changed());
    },
    onError: ({ message }) => {
      toast.error(`${m.auth_account_password_change_error()}. ${message}`);
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
            required: m.common_validation_required_password(),
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
              <Label>{m.auth_account_current_password_label()}</Label>
              <Input placeholder={m.auth_account_current_password_placeholder()} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />

        <Controller
          control={control}
          name="newPassword"
          rules={{
            required: m.common_validation_required_password(),
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
              <Label>{m.auth_account_new_password_label()}</Label>
              <Input placeholder={m.auth_account_new_password_placeholder()} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />

        <div className="flex">
          <Button
            isPending={mutation.isPending}
            size="md"
            intent="primary"
            className="flex-none"
            type="submit"
          >
            {m.auth_account_save()}
          </Button>
        </div>
      </div>
    </Form>
  );
}

function ChangeEmail({ email }: { email: string }) {
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
      toast.success(m.auth_account_email_verification_sent());
    },
    onError: ({ message }) => {
      toast.error(`${m.auth_account_email_verification_error()}. ${message}`);
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
            required: m.common_validation_required_email(),
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
              <Label>{m.auth_account_email_label()}</Label>
              <Input placeholder={m.auth_account_email_placeholder()} />
              <Description>{m.auth_account_email_verification_desc()}</Description>
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />

        <div className="flex">
          <Button
            isPending={mutation.isPending}
            size="md"
            intent="primary"
            className="flex-none"
            type="submit"
          >
            {m.auth_account_save()}
          </Button>
        </div>
      </div>
    </Form>
  );
}

function DeleteAccount() {
  const [open, setOpen] = useState(false);
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
      toast.success(m.auth_account_verification_email_sent());
    },
    onError: ({ message }) => {
      toast.error(`${m.auth_account_delete_account_error()}. ${message}`);
    },
  });

  return (
    <>
      <Button intent="danger" size="sm" onPress={() => setOpen(true)}>
        <TrashSimpleIcon />
        {m.auth_account_delete_account()}
      </Button>
      <ModalContent isOpen={open} onOpenChange={setOpen} role="alertdialog">
        <ModalHeader>
          <ModalTitle>{m.auth_account_delete_account()}</ModalTitle>
          <ModalDescription>{m.auth_account_delete_account_description()}</ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <ModalClose>{m.common_modal_cancel()}</ModalClose>
          <Button
            intent="danger"
            type="submit"
            isPending={mutation.isPending}
            onPress={() => mutation.mutate()}
          >
            {m.auth_account_continue()}
          </Button>
        </ModalFooter>
      </ModalContent>
    </>
  );
}
