"use client";

import { useObjektSelect } from "@/hooks/use-objekt-select";
import { api } from "@/lib/trpc/client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Checkbox,
  Form,
  Link,
  Loader,
  Modal,
  Note,
  Select,
} from "../../ui";
import { Error } from "../../error-boundary";

export function AddToList({
  onClick,
}: {
  onClick: (open: () => void) => void;
}) {
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const [open, setOpen] = useState(false);
  const addToList = api.list.addObjektsToList.useMutation({
    onSuccess: (rowCount) => {
      setOpen(false);
      reset();
      toast.success(`${rowCount} objekt added to the list`, {
        position: "top-center",
        duration: 1300,
      });
    },
    onError: () => {
      toast.error("Error adding objekt to list");
    },
  });
  return (
    <>
      <Button intent="outline" onClick={() => onClick(() => setOpen(true))}>
        Add to list
      </Button>
      <Modal.Content isOpen={open} onOpenChange={setOpen}>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            addToList.mutate({
              slug: formData.get("slug") as string,
              skipDups: formData.get("skipDups") === "on",
              collectionSlugs: selected.map((a) => a.slug),
            });
          }}
        >
          <Modal.Header>
            <Modal.Title>Add to list</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <AddToListForm />
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>Cancel</Modal.Close>
            <Button type="submit" isPending={addToList.isPending}>
              Add
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Content>
    </>
  );
}

function AddToListForm() {
  const list = api.list.myList.useQuery();

  if (list.isPending)
    return (
      <div className="flex justify-center">
        <Loader variant="ring" />
      </div>
    );

  if (list.isError)
    return (
      <Error onRetry={() => list.refetch()} message="Error fetching list" />
    );

  if (!list.data || list.data.length === 0)
    return (
      <Note intent="default">
        You don&apos;t have any list yet.{" "}
        <Link href="/list">Create one here</Link>.
      </Note>
    );

  return (
    <div className="flex flex-col gap-4">
      <Select
        label="My List"
        placeholder="Select a list"
        name="slug"
        isRequired
      >
        <Select.Trigger />
        <Select.List items={list.data ?? []}>
          {(item) => (
            <Select.Option id={item.slug} textValue={item.slug}>
              {item.name}
            </Select.Option>
          )}
        </Select.List>
      </Select>
      <Checkbox
        defaultSelected={true}
        name="skipDups"
        label="Prevent duplicate"
        description="Skip the same objekt when adding"
      />
    </div>
  );
}

export function RemoveFromList({
  slug,
  onClick,
}: {
  slug: string;
  onClick: (open: () => void) => void;
}) {
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const removeObjektsFromList = api.list.removeObjektsFromList.useMutation({
    onSuccess: () => {
      setOpen(false);
      reset();
      utils.list.getEntries.invalidate(slug);
      toast.success("Objekt removed from the list", {
        position: "top-center",
        duration: 1300,
      });
    },
    onError: () => {
      toast.error("Error removing objekt from list");
    },
  });
  return (
    <>
      <Button intent="outline" onClick={() => onClick(() => setOpen(true))}>
        Remove from list
      </Button>
      <Modal.Content isOpen={open} onOpenChange={setOpen}>
        <Form
          onSubmit={async (e) => {
            e.preventDefault();
            removeObjektsFromList.mutate({
              slug: slug.toString(),
              ids: selected.map((a) => Number(a.id)),
            });
          }}
        >
          <Modal.Header>
            <Modal.Title>Remove objekt</Modal.Title>
            <Modal.Description>
              This will permanently remove the selected objekt from the list.
              Continue?
            </Modal.Description>
          </Modal.Header>
          <Modal.Footer>
            <Modal.Close>Cancel</Modal.Close>
            <Button
              intent="danger"
              type="submit"
              isPending={removeObjektsFromList.isPending}
            >
              Continue
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Content>
    </>
  );
}
