"use client";

import { useObjektSelect } from "@/hooks/use-objekt-select";
import { Button, Form, Modal, Select } from "../ui";
import { useCallback, useState } from "react";
import { api } from "@/lib/trpc/client";
import { Key } from "react-aria";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useIsSSR } from "react-aria";

export function SelectMode() {
  const isSsr = useIsSSR();
  const { data: session } = authClient.useSession();
  const mode = useObjektSelect((a) => a.mode);
  const toggleMode = useObjektSelect((a) => a.toggleMode);
  const reset = useObjektSelect((a) => a.reset);
  const selected = useObjektSelect((a) => a.selected);

  const handleAddList = useCallback(
    (open: () => void) => {
      if (selected.length < 1) {
        toast.error("Must select at least one objekt");
      } else {
        open();
      }
    },
    [selected]
  );

  if (!isSsr && !session) {
    return null;
  }

  return (
    <div className="flex gap-2 items-center">
      <Button
        size="small"
        className={mode ? "!inset-ring-primary" : ""}
        intent="outline"
        onClick={toggleMode}
      >
        Select mode
      </Button>

      {mode && (
        <>
          <Button intent="outline" size="extra-small" onClick={reset}>
            Reset
          </Button>
          <AddToList>
            {({ open }) => (
              <Button
                intent="outline"
                size="extra-small"
                onClick={() => handleAddList(open)}
              >
                Add to list
              </Button>
            )}
          </AddToList>
        </>
      )}
    </div>
  );
}

function AddToList({
  children,
}: {
  children: ({ open }: { open: () => void }) => React.ReactNode;
}) {
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const toggleMode = useObjektSelect((a) => a.toggleMode);
  const [slug, setSlug] = useState<Key>("");
  const [open, setOpen] = useState(false);
  const list = api.list.myList.useQuery();
  const addToList = api.list.addObjektsToList.useMutation({
    onSuccess: () => {
      setOpen(false);
      reset();
      toggleMode();
      toast.success("Objekt added to the list");
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
            addToList.mutate({
              slug: slug.toString(),
              collectionSlugs: selected as string[],
            });
          }}
        >
          <Modal.Header>
            <Modal.Title>Add to list</Modal.Title>
            <Modal.Description>
              <span className="text-muted-fg text-xs">
                You must create a list before you can add an objekt.
              </span>
            </Modal.Description>
          </Modal.Header>
          <Modal.Body>
            <Select
              label="My List"
              placeholder="Select a list"
              selectedKey={slug}
              onSelectionChange={setSlug}
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
