"use client";

import React, { Suspense, useRef, useState } from "react";
import {
  QueryErrorResetBoundary,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  Button,
  Checkbox,
  Form,
  Loader,
  Modal,
  Sheet,
  TextField,
} from "@/components/ui";
import ErrorFallbackRender from "@/components/error-boundary";
import { ListAccounts } from "./link-account";
import { TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export default function UserAccountModal({ open, setOpen }: Props) {
  const formRef = useRef<HTMLFormElement>(null!);
  const session = authClient.useSession();

  const mutation = useMutation({
    mutationFn: async (data: { showSocial: boolean; name: string }) => {
      const result = await authClient.updateUser(data);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      setOpen(false);
      session.refetch();
      toast.success("Account updated");
    },
    onError: () => {
      toast.error("Error edit account");
    },
  });

  return (
    <Sheet.Content
      classNames={{ content: "max-w-md" }}
      isOpen={open}
      onOpenChange={setOpen}
    >
      <Sheet.Header>
        <Sheet.Title>Account</Sheet.Title>
        <Sheet.Description>Manage your account</Sheet.Description>
      </Sheet.Header>
      <Sheet.Body>
        <Form
          ref={formRef}
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const name = formData.get("name") as string;
            const showSocial = formData.get("showSocial") === "on";

            mutation.mutate({
              name,
              showSocial,
            });
          }}
        >
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary
                onReset={reset}
                FallbackComponent={ErrorFallbackRender}
              >
                <Suspense
                  fallback={
                    <div className="flex justify-center py-2">
                      <Loader variant="ring" />
                    </div>
                  }
                >
                  <div className="flex flex-col gap-6 h-full">
                    <UserAccountForm />
                    <ListAccounts />
                    <div>
                      <DeleteAccount />
                    </div>
                  </div>
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </Form>
      </Sheet.Body>
      <Sheet.Footer>
        <Sheet.Close>Cancel</Sheet.Close>
        <Button
          intent="primary"
          type="submit"
          isPending={mutation.isPending}
          onClick={() => formRef.current.requestSubmit()}
        >
          Save
        </Button>
      </Sheet.Footer>
    </Sheet.Content>
  );
}

function UserAccountForm() {
  const session = useSuspenseQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const result = await authClient.getSession();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <TextField
        isRequired
        label="Name"
        placeholder="Your name"
        name="name"
        defaultValue={session.data.user.name}
      />
      <Checkbox
        label="Show Social"
        name="showSocial"
        description="Display your social account such as Discord username in List and Cosmo profile"
        defaultSelected={session.data.user.showSocial ?? false}
      />
    </div>
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
      <Button intent="danger" size="small" onClick={() => setOpen(true)}>
        <TrashSimpleIcon data-slot="icon" />
        Delete Account
      </Button>
      <Modal.Content isOpen={open} onOpenChange={setOpen}>
        <Modal.Header>
          <Modal.Title>Delete Account</Modal.Title>
          <Modal.Description>
            You will be sent a verification email for confirmation. Continue?
          </Modal.Description>
        </Modal.Header>
        <Modal.Footer>
          <Modal.Close>Cancel</Modal.Close>
          <Button
            intent="danger"
            type="submit"
            isPending={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Continue
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </>
  );
}
