"use client";

import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { ObjektActionModalProps } from "@/components/filters/objekt/common";
import { useAddToList } from "@/hooks/actions/add-to-list";
import { useRemoveFromList } from "@/hooks/actions/remove-from-list";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useTarget } from "@/hooks/use-target";
import { orpc } from "@/lib/orpc/client";
import ErrorFallbackRender from "../../error-boundary";
import {
  Button,
  Checkbox,
  Form,
  Link,
  Loader,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Note,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../../ui";

export function AddToListModal({ open, setOpen }: ObjektActionModalProps) {
  const formRef = useRef<HTMLFormElement>(null!);
  const selected = useObjektSelect((a) => a.selected);
  const addToList = useAddToList();
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>Add to list</ModalTitle>
      </ModalHeader>
      <ModalBody>
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
      </ModalBody>
      <ModalFooter>
        <ModalClose>Cancel</ModalClose>
        <Button
          type="submit"
          isPending={addToList.isPending}
          onClick={() => formRef.current.requestSubmit()}
        >
          Add
        </Button>
      </ModalFooter>
    </ModalContent>
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
        <SelectTrigger />
        <SelectContent>
          {data.map((item) => (
            <SelectItem key={item.slug} id={item.slug} textValue={item.slug}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
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

export function RemoveFromListModal({ open, setOpen }: ObjektActionModalProps) {
  const target = useTarget((a) => a.list)!;
  const selected = useObjektSelect((a) => a.selected);
  const removeObjektsFromList = useRemoveFromList();
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>Remove objekt</ModalTitle>
        <ModalDescription>
          This will permanently remove the selected objekt from the list. Continue?
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>Cancel</ModalClose>

        <Button
          intent="danger"
          type="submit"
          isPending={removeObjektsFromList.isPending}
          onClick={() => {
            removeObjektsFromList.mutate(
              {
                slug: target.slug,
                ids: selected.map((a) => Number(a.id)),
              },
              {
                onSuccess: () => {
                  setOpen(false);
                },
              },
            );
          }}
        >
          Continue
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
