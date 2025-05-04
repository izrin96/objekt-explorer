"use client";

import {
  Button,
  Card,
  Form,
  Link,
  Menu,
  Modal,
  TextField,
} from "@/components/ui";
import { api } from "@/lib/trpc/client";
import React, { useState } from "react";
import { IconDotsVertical } from "@intentui/icons";

export default function MyList() {
  const [lists] = api.list.myList.useSuspenseQuery();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-semibold">My List</div>

      <div className="w-full">
        <CreateList />
      </div>

      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <Card key={list.slug} className="bg-secondary/20">
            <Card.Header className="flex justify-between">
              <Link
                href={`/list/${list.slug}`}
                className="font-semibold flex-1"
              >
                {list.name}
              </Link>
              <EditList slug={list.slug} list={list}>
                {({ open: openEdit }) => (
                  <DeleteList slug={list.slug}>
                    {({ open: openDelete }) => (
                      <Menu>
                        <Button intent="outline" size="extra-small">
                          <IconDotsVertical />
                        </Button>
                        <Menu.Content className="sm:min-w-56">
                          <Menu.Item onAction={openEdit}>Edit</Menu.Item>
                          <Menu.Item isDanger onAction={openDelete}>
                            Delete
                          </Menu.Item>
                        </Menu.Content>
                      </Menu>
                    )}
                  </DeleteList>
                )}
              </EditList>
            </Card.Header>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CreateList() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const utils = api.useUtils();
  const createList = api.list.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      utils.list.myList.invalidate();
    },
  });
  return (
    <>
      <Button onClick={() => setOpen(true)}>Create list</Button>
      <Modal.Content isOpen={open} onOpenChange={setOpen}>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createList.mutate({ name });
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
              value={name}
              onChange={setName}
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

function DeleteList({
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
      utils.list.myList.invalidate();
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

function EditList({
  slug,
  list,
  children,
}: {
  slug: string;
  list: { name: string };
  children: ({ open }: { open: () => void }) => React.ReactNode;
}) {
  const [name, setName] = useState(list.name);
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const editList = api.list.edit.useMutation({
    onSuccess: () => {
      setOpen(false);
      utils.list.myList.invalidate();
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
            editList.mutate({ slug, name });
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
              value={name}
              onChange={setName}
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
