"use client";

import { useObjektSelect } from "@/hooks/use-objekt-select";
import { Button, Form, Link, Modal, Note, Select } from "../ui";
import { useCallback, useState } from "react";
import { api } from "@/lib/trpc/client";
import { Key } from "react-aria";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useIsSSR } from "react-aria";

export function SelectMode({
  slug,
  state,
}: {
  slug?: string;
  state: "add" | "remove";
}) {
  const isSsr = useIsSSR();
  const { data: session } = authClient.useSession();
  const mode = useObjektSelect((a) => a.mode);
  const toggleMode = useObjektSelect((a) => a.toggleMode);
  const reset = useObjektSelect((a) => a.reset);
  const selected = useObjektSelect((a) => a.selected);

  const handleAction = useCallback(
    (open: () => void) => {
      if (selected.length < 1) {
        toast.error("Must select at least one objekt", {
          position: "top-center",
          duration: 1300,
        });
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
          {state === "add" && (
            <AddToList>
              {({ open }) => (
                <Button
                  intent="outline"
                  size="extra-small"
                  onClick={() => handleAction(open)}
                >
                  Add to list
                </Button>
              )}
            </AddToList>
          )}
          {state === "remove" && slug && (
            <RemoveFromList slug={slug}>
              {({ open }) => (
                <Button
                  intent="outline"
                  size="extra-small"
                  onClick={() => handleAction(open)}
                >
                  Remove from list
                </Button>
              )}
            </RemoveFromList>
          )}
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
      toast.success("Objekt added to the list", {
        position: "top-center",
        duration: 1300,
      });
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
          </Modal.Header>
          <Modal.Body>
            {(list.data ?? []).length > 0 ? (
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
            ) : (
              <Note intent="default">
                You don&apos;t have any list yet.{" "}
                <Link href="/list">Create one here</Link>.
              </Note>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>Cancel</Modal.Close>
            <Button
              type="submit"
              isPending={addToList.isPending}
              isDisabled={!slug}
            >
              Add
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Content>
    </>
  );
}

function RemoveFromList({
  slug,
  children,
}: {
  slug: string;
  children: ({ open }: { open: () => void }) => React.ReactNode;
}) {
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const toggleMode = useObjektSelect((a) => a.toggleMode);
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const removeObjektsFromList = api.list.removeObjektsFromList.useMutation({
    onSuccess: () => {
      setOpen(false);
      reset();
      toggleMode();
      utils.list.getEntries.invalidate(slug);
      toast.success("Objekt removed from the list", {
        position: "top-center",
        duration: 1300,
      });
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
            removeObjektsFromList.mutate({
              slug: slug.toString(),
              ids: selected as number[],
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
