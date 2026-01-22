"use client";

import { TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { QueryErrorResetBoundary, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import type { User } from "@/lib/server/auth";

import ErrorFallbackRender from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Description, FieldError, Label } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
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
import { authClient } from "@/lib/auth-client";
import { sessionOptions } from "@/lib/query-options";

import { ListAccounts } from "./link-account";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export default function UserAccountModal({ open, setOpen }: Props) {
  return (
    <SheetContent className={"sm:max-w-md"} isOpen={open} onOpenChange={setOpen}>
      <SheetHeader>
        <SheetTitle>Account</SheetTitle>
        <SheetDescription>Manage your account</SheetDescription>
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
                  <ListAccounts />
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
  const session = useSuspenseQuery(sessionOptions);

  if (!session.data) return;

  return (
    <div className="flex flex-col gap-9">
      <UserAccountForm user={session.data.user} setOpen={setOpen} />
      <ChangeEmail email={session.data.user.email} />
    </div>
  );
}

function UserAccountForm({ user, setOpen }: { user: User; setOpen: (val: boolean) => void }) {
  const router = useRouter();

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
    onSuccess: (_, _v, _o, { client }) => {
      setOpen(false);
      client.refetchQueries({
        queryKey: ["session"],
      });
      router.refresh();
      toast.success("Account updated");
    },
    onError: ({ message }) => {
      toast.error(`Error edit account. ${message}`);
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
            required: "Name is required.",
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
              <Label>Name</Label>
              <Input placeholder="Your name" />
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
              <Label>Show Social</Label>
              <Description>
                Display your social account such as Discord username in List and Cosmo profile
              </Description>
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
              <Label>Remove Profile Picture</Label>
            </Checkbox>
          )}
        />

        <span className="text-muted-fg text-xs">
          Profile picture can only be set by pulling from X or Discord in the Social Link section
          below by clicking Refresh.
        </span>

        <div className="flex">
          <Button size="md" intent="outline" type="submit" isPending={mutation.isPending}>
            Save
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
      toast.success("Email verification has been sent");
    },
    onError: ({ message }) => {
      toast.error(`Error sending email verification. ${message}`);
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
            required: "Email is required.",
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
              <Label>Email</Label>
              <Input placeholder="Your email" />
              <Description>
                Verification email will be sent to verify your new email address
              </Description>
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />

        <div className="flex">
          <Button
            isDisabled={mutation.isPending}
            size="md"
            intent="outline"
            className="flex-none"
            type="submit"
          >
            Save Email
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
      toast.success("Verification email sent");
    },
    onError: ({ message }) => {
      toast.error(`Delete account error. ${message}`);
    },
  });

  return (
    <>
      <Button intent="danger" size="sm" onClick={() => setOpen(true)}>
        <TrashSimpleIcon data-slot="icon" />
        Delete Account
      </Button>
      <ModalContent isOpen={open} onOpenChange={setOpen}>
        <ModalHeader>
          <ModalTitle>Delete Account</ModalTitle>
          <ModalDescription>
            You will be sent a verification email for confirmation. Continue?
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <ModalClose>Cancel</ModalClose>
          <Button
            intent="danger"
            type="submit"
            isPending={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Continue
          </Button>
        </ModalFooter>
      </ModalContent>
    </>
  );
}
