import React, { useRef, useState } from "react";
import { Checkbox } from "./ui/checkbox";
import { Button, Form, Loader, Sheet, TextField } from "./ui";
import { QueryErrorResetBoundary, useMutation } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "./error-boundary";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

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
    <Sheet.Content isOpen={open} onOpenChange={setOpen}>
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
                <UserAccountForm />
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
  const { data, isPending } = authClient.useSession();

  if (isPending)
    return (
      <div className="flex justify-center">
        <Loader variant="ring" />
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <TextField
        isRequired
        label="Name"
        placeholder="Your name"
        name="name"
        defaultValue={data?.user.name}
      />
      <Checkbox
        label="Show Social"
        name="showSocial"
        description="Display your social account such as Discord username in List and Cosmo profile"
        defaultSelected={data?.user.showSocial ?? false}
      />
    </div>
  );
}
