"use client";

import { Button, Form, Modal, TextField } from "@/components/ui";
import { api } from "@/lib/trpc/client";
import { useState } from "react";
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
  list,
  children,
}: {
  slug: string;
  list: { name: string };
  children: ({ open }: { open: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const editList = api.list.edit.useMutation({
    onSuccess: () => {
      setOpen(false);
      toast.success("List updated");
      utils.list.myList.invalidate();
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
      <Modal.Content isOpen={open} onOpenChange={setOpen}>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            editList.mutate({ slug, name: formData.get("name") as string });
          }}
        >
          <Modal.Header>
            <Modal.Title>Edit list</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <TextField
              isRequired
              autoFocus
              label="Name"
              placeholder="My list"
              name="name"
              defaultValue={list.name}
            />
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>Cancel</Modal.Close>
            <Button type="submit" isPending={editList.isPending}>
              Save
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Content>
    </>
  );
}
