"use client";

import { PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Suspense, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useAddToList } from "@/hooks/actions/add-to-list";
import { useRemoveFromList } from "@/hooks/actions/remove-from-list";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { orpc } from "@/lib/orpc/client";
import ErrorFallbackRender from "../../error-boundary";
import { Button, Checkbox, Form, Link, Loader, Modal, Note, Select } from "../../ui";

type AddProps = {
  handleAction: (open: () => void) => void;
};

export function AddToList({ handleAction }: AddProps) {
  const t = useTranslations("filter");
  const [addOpen, setAddOpen] = useState(false);
  return (
    <>
      <AddToListModal open={addOpen} setOpen={setAddOpen} />
      <Button intent="outline" onClick={() => handleAction(() => setAddOpen(true))}>
        <PlusIcon weight="regular" data-slot="icon" />
        {t("add_to_list")}
      </Button>
    </>
  );
}

type AddToListModalProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function AddToListModal({ open, setOpen }: AddToListModalProps) {
  const formRef = useRef<HTMLFormElement>(null!);
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const addToList = useAddToList();
  return (
    <Modal.Content isOpen={open} onOpenChange={setOpen}>
      <Modal.Header>
        <Modal.Title>Add to list</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          ref={formRef}
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            addToList.mutate(
              {
                slug: formData.get("slug") as string,
                skipDups: formData.get("skipDups") === "on",
                collectionSlugs: selected.map((a) => a.slug),
              },
              {
                onSuccess: () => {
                  setOpen(false);
                  reset();
                },
              },
            );
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
                  <AddToListForm />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Modal.Close>Cancel</Modal.Close>
        <Button
          type="submit"
          isPending={addToList.isPending}
          onClick={() => formRef.current.requestSubmit()}
        >
          Add
        </Button>
      </Modal.Footer>
    </Modal.Content>
  );
}

function AddToListForm() {
  const { data } = useSuspenseQuery(orpc.list.list.queryOptions());

  if (data.length === 0)
    return (
      <Note intent="default">
        You don&apos;t have any list yet.{" "}
        <Link className="underline" href="/list">
          Create one here
        </Link>
        .
      </Note>
    );

  return (
    <div className="flex flex-col gap-4">
      <Select label="My List" placeholder="Select a list" name="slug" isRequired>
        <Select.Trigger />
        <Select.List>
          {data.map((item) => (
            <Select.Option key={item.slug} id={item.slug} textValue={item.slug}>
              {item.name}
            </Select.Option>
          ))}
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

type RemoveProps = {
  slug: string;
  handleAction: (open: () => void) => void;
};

export function RemoveFromList({ slug, handleAction }: RemoveProps) {
  const t = useTranslations("filter");
  const [open, setOpen] = useState(false);
  return (
    <>
      <RemoveFromListModal slug={slug} open={open} setOpen={setOpen} />
      <Button intent="outline" onClick={() => handleAction(() => setOpen(true))}>
        <TrashSimpleIcon weight="regular" data-slot="icon" />
        {t("remove_from_list")}
      </Button>
    </>
  );
}

type RemoveFromListModalProps = {
  slug: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function RemoveFromListModal({ slug, open, setOpen }: RemoveFromListModalProps) {
  const selected = useObjektSelect((a) => a.selected);
  const reset = useObjektSelect((a) => a.reset);
  const removeObjektsFromList = useRemoveFromList();
  return (
    <Modal.Content isOpen={open} onOpenChange={setOpen}>
      <Modal.Header>
        <Modal.Title>Remove objekt</Modal.Title>
        <Modal.Description>
          This will permanently remove the selected objekt from the list. Continue?
        </Modal.Description>
      </Modal.Header>
      <Modal.Footer>
        <Modal.Close>Cancel</Modal.Close>

        <Button
          intent="danger"
          type="submit"
          isPending={removeObjektsFromList.isPending}
          onClick={() => {
            removeObjektsFromList.mutate(
              {
                slug: slug.toString(),
                ids: selected.map((a) => Number(a.id)),
              },
              {
                onSuccess: () => {
                  setOpen(false);
                  reset();
                },
              },
            );
          }}
        >
          Continue
        </Button>
      </Modal.Footer>
    </Modal.Content>
  );
}
