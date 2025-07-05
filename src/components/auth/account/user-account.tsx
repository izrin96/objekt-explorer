"use client";

import { TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import {
  QueryErrorResetBoundary,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import ErrorFallbackRender from "@/components/error-boundary";
import { Button, Checkbox, Form, Loader, Modal, Sheet, TextField } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import type { Session } from "@/lib/server/auth";
import { ListAccounts } from "./link-account";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export default function UserAccountModal({ open, setOpen }: Props) {
  return (
    <Sheet.Content className={"max-w-md"} isOpen={open} onOpenChange={setOpen}>
      <Sheet.Header>
        <Sheet.Title>Account</Sheet.Title>
        <Sheet.Description>Manage your account</Sheet.Description>
      </Sheet.Header>
      <Sheet.Body>
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
      </Sheet.Body>
    </Sheet.Content>
  );
}

function UserAccount({ setOpen }: { setOpen: (val: boolean) => void }) {
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

  if (!session.data) return;

  return (
    <div className="flex flex-col gap-9">
      <UserAccountForm user={session.data.user} setOpen={setOpen} />
      <ChangeEmail email={session.data.user.email} />
    </div>
  );
}

function UserAccountForm({
  user,
  setOpen,
}: {
  user: Session["user"];
  setOpen: (val: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const session = authClient.useSession();

  const mutation = useMutation({
    mutationFn: async (data: { showSocial: boolean; name: string }) => {
      const result = await authClient.updateUser(data);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      session.refetch();
      queryClient.invalidateQueries({
        queryKey: ["session"],
      });
      setOpen(false);
      toast.success("Account updated");
    },
    onError: ({ message }) => {
      toast.error(`Error edit account. ${message}`);
    },
  });

  return (
    <Form
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
      <div className="flex flex-col gap-6">
        <TextField
          isRequired
          label="Name"
          placeholder="Your name"
          name="name"
          defaultValue={user.name}
        />

        <Checkbox
          label="Show Social"
          name="showSocial"
          description="Display your social account such as Discord username in List and Cosmo profile"
          defaultSelected={user.showSocial ?? false}
        />

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

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        mutation.mutate({
          newEmail: email,
        });
      }}
    >
      <div className="flex flex-col gap-3">
        <TextField
          className="w-full"
          isRequired
          label="Email"
          placeholder="Your email"
          name="email"
          type="email"
          description="Verification email will be sent to verify your new email address"
          defaultValue={email}
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
