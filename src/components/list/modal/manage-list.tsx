"use client";

import {
  QueryErrorResetBoundary,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import ErrorFallbackRender from "@/components/error-boundary";
import { Button, Checkbox, Form, Link, Loader, Modal, Sheet, TextField } from "@/components/ui";
import { orpc } from "@/lib/orpc/client";

type CreateListModalProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function CreateListModal({ open, setOpen }: CreateListModalProps) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null!);
  const createList = useMutation(
    orpc.list.create.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        toast.success("List created");
        queryClient.invalidateQueries({
          queryKey: orpc.list.list.key(),
        });
      },
      onError: () => {
        toast.error("Error creating list");
      },
    }),
  );
  return (
    <Modal.Content isOpen={open} onOpenChange={setOpen}>
      <Modal.Header>
        <Modal.Title>Create list</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          ref={formRef}
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createList.mutate({
              name: formData.get("name") as string,
              hideUser: formData.get("hideUser") === "on",
            });
          }}
        >
          <div className="flex flex-col gap-6">
            <TextField isRequired autoFocus label="Name" placeholder="My list" name="name" />
            <Checkbox
              label="Hide User"
              name="hideUser"
              description="Hide Objekt Tracker account from this list"
              defaultSelected={true}
            />
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Modal.Close>Cancel</Modal.Close>
        <Button
          type="submit"
          isPending={createList.isPending}
          onClick={() => formRef.current.requestSubmit()}
        >
          Create
        </Button>
      </Modal.Footer>
    </Modal.Content>
  );
}

type DeleteListModalProps = {
  slug: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function DeleteListModal({ slug, open, setOpen }: DeleteListModalProps) {
  const queryClient = useQueryClient();
  const deleteList = useMutation(
    orpc.list.delete.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        toast.success("List deleted");
        queryClient.invalidateQueries({
          queryKey: orpc.list.list.key(),
        });
      },
      onError: () => {
        toast.error("Error deleting list");
      },
    }),
  );
  return (
    <Modal.Content isOpen={open} onOpenChange={setOpen}>
      <Modal.Header>
        <Modal.Title>Delete list</Modal.Title>
        <Modal.Description>
          This will permanently delete the selected list. Continue?
        </Modal.Description>
      </Modal.Header>
      <Modal.Footer>
        <Modal.Close>Cancel</Modal.Close>
        <Button
          intent="danger"
          type="submit"
          isPending={deleteList.isPending}
          onClick={() => deleteList.mutate({ slug })}
        >
          Continue
        </Button>
      </Modal.Footer>
    </Modal.Content>
  );
}

type EditListModalProps = {
  slug: string;
  onComplete?: () => void;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function EditListModal({ slug, onComplete, open, setOpen }: EditListModalProps) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null!);
  const editList = useMutation(
    orpc.list.edit.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        toast.success("List updated");
        queryClient.invalidateQueries({
          queryKey: orpc.list.list.key(),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.list.find.key({
            input: slug,
          }),
        });
        onComplete?.();
      },
      onError: () => {
        toast.error("Error editing list");
      },
    }),
  );
  return (
    <Sheet.Content isOpen={open} onOpenChange={setOpen}>
      <Sheet.Header>
        <Sheet.Title>Edit list</Sheet.Title>
        <Sheet.Description>Manage your list</Sheet.Description>
      </Sheet.Header>
      <Sheet.Body>
        <Form
          ref={formRef}
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            editList.mutate({
              slug,
              name: formData.get("name") as string,
              hideUser: formData.get("hideUser") === "on",
            });
          }}
        >
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
                  <EditListForm slug={slug} />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </Form>
      </Sheet.Body>
      <Sheet.Footer>
        <Sheet.Close>Cancel</Sheet.Close>
        <Button
          onClick={() => formRef.current.requestSubmit()}
          type="submit"
          isPending={editList.isPending}
        >
          Save
        </Button>
      </Sheet.Footer>
    </Sheet.Content>
  );
}

function EditListForm({ slug }: { slug: string }) {
  const { data } = useSuspenseQuery(
    orpc.list.find.queryOptions({
      input: slug,
      gcTime: 0,
    }),
  );
  return (
    <div className="flex flex-col gap-6">
      <TextField
        isRequired
        autoFocus
        label="Name"
        placeholder="My list"
        name="name"
        defaultValue={data.name}
      />
      <Checkbox
        label="Hide User"
        name="hideUser"
        description="Hide Objekt Tracker account from this list"
        defaultSelected={data.hideUser ?? false}
      />
      <span className="text-muted-fg text-sm">
        To delete this list, visit{" "}
        <Link href="/list" className="underline">
          Manage list
        </Link>{" "}
        page.
      </span>
    </div>
  );
}
