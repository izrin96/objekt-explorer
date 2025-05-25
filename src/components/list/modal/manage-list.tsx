"use client";

import ErrorFallbackRender from "@/components/error-boundary";
import {
  Button,
  Checkbox,
  Form,
  Link,
  Loader,
  Modal,
  Sheet,
  TextField,
} from "@/components/ui";
import { api } from "@/lib/trpc/client";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";

type CreateListModalProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function CreateListModal({ open, setOpen }: CreateListModalProps) {
  const formRef = useRef<HTMLFormElement>(null!);
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
            <TextField
              isRequired
              autoFocus
              label="Name"
              placeholder="My list"
              name="name"
            />
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
    <Modal.Content isOpen={open} onOpenChange={setOpen}>
      <Modal.Header>
        <Modal.Title>Delete list</Modal.Title>
        <Modal.Description>
          This will permanently delete the selected list. Continue?
        </Modal.Description>
      </Modal.Header>
      <Form
        onSubmit={async (e) => {
          e.preventDefault();
          deleteList.mutate({ slug });
        }}
      >
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
  );
}

type EditListModalProps = {
  slug: string;
  onComplete?: () => void;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function EditListModal({
  slug,
  onComplete,
  open,
  setOpen,
}: EditListModalProps) {
  const formRef = useRef<HTMLFormElement>(null!);
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
