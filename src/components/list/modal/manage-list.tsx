"use client";

import ErrorFallbackRender from "@/components/error-boundary";
import {
  Button,
  Checkbox,
  Form,
  Loader,
  Modal,
  Sheet,
  TextField,
} from "@/components/ui";
import { api } from "@/lib/trpc/client";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";

export function CreateList() {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const createList = api.list.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      toast.success("List created");
      utils.list.myList.invalidate();
    },
    onError: () => {
      toast.error("Error creating list");
    },
  });
  return (
    <>
      <Button onClick={() => setOpen(true)}>Create list</Button>
      <Modal.Content isOpen={open} onOpenChange={setOpen}>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createList.mutate({ name: formData.get("name") as string });
          }}
        >
          <Modal.Header>
            <Modal.Title>Create list</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <TextField
              isRequired
              autoFocus
              label="Name"
              placeholder="My list"
              name="name"
            />
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>Cancel</Modal.Close>
            <Button type="submit" isPending={createList.isPending}>
              Create
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Content>
    </>
  );
}

export function DeleteList({
  slug,
  children,
}: {
  slug: string;
  children: ({ open }: { open: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const deleteList = api.list.delete.useMutation({
    onSuccess: () => {
      setOpen(false);
      toast.success("List deleted");
      utils.list.myList.invalidate();
    },
    onError: () => {
      toast.error("Error deleting list");
    },
  });
  return (
    <>
      {children?.({
        open: () => {
          setOpen(true);
        },
      })}
      <Modal.Content role="alertdialog" isOpen={open} onOpenChange={setOpen}>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            deleteList.mutate({ slug });
          }}
        >
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
            >
              Continue
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Content>
    </>
  );
}

export function EditList({
  slug,
  onComplete,
  children,
}: {
  slug: string;
  onComplete?: () => void;
  children: ({ open }: { open: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const editList = api.list.edit.useMutation({
    onSuccess: () => {
      setOpen(false);
      toast.success("List updated");
      utils.list.myList.invalidate();
      utils.list.get.invalidate(slug);
      onComplete?.();
    },
    onError: () => {
      toast.error("Error editing list");
    },
  });
  return (
    <>
      {children?.({
        open: () => {
          setOpen(true);
        },
      })}
      <Sheet.Content isOpen={open} onOpenChange={setOpen}>
        <Form
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
          <Sheet.Header>
            <Sheet.Title>Edit list</Sheet.Title>
          </Sheet.Header>
          <Sheet.Body>
            <QueryErrorResetBoundary>
              {({ reset }) => (
                <ErrorBoundary
                  onReset={reset}
                  FallbackComponent={ErrorFallbackRender}
                >
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
          </Sheet.Body>
          <Sheet.Footer>
            <Sheet.Close>Cancel</Sheet.Close>
            <Button type="submit" isPending={editList.isPending}>
              Save
            </Button>
          </Sheet.Footer>
        </Form>
      </Sheet.Content>
    </>
  );
}

function EditListForm({ slug }: { slug: string }) {
  const [data] = api.list.get.useSuspenseQuery(slug);
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
        label="Hide Discord"
        name="hideUser"
        description="Hide your Discord from list"
        defaultSelected={data.hideUser ?? false}
      />
    </div>
  );
}
