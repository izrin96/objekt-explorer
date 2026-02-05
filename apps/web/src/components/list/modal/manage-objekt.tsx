"use client";

import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Form } from "react-aria-components";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { useShallow } from "zustand/react/shallow";

import type { ObjektActionModalProps } from "@/components/filters/objekt/common";

import Portal from "@/components/portal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Description, FieldError, Label } from "@/components/ui/field";
import { Link } from "@/components/ui/link";
import { Loader } from "@/components/ui/loader";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Note } from "@/components/ui/note";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useAddToList } from "@/hooks/actions/add-to-list";
import { useRemoveFromList } from "@/hooks/actions/remove-from-list";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useTarget } from "@/hooks/use-target";
import { orpc } from "@/lib/orpc/client";

import ErrorFallbackRender from "../../error-boundary";

export function AddToListModal({ open, setOpen }: ObjektActionModalProps) {
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>Add to list</ModalTitle>
      </ModalHeader>
      <ModalBody>
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
                <AddToListForm setOpen={setOpen} />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ModalBody>
      <ModalFooter id="submit-form">
        <ModalClose>Cancel</ModalClose>
      </ModalFooter>
    </ModalContent>
  );
}

function AddToListForm({ setOpen }: { setOpen: (val: boolean) => void }) {
  const { data } = useSuspenseQuery(orpc.list.list.queryOptions());
  const addToList = useAddToList();
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));

  const { handleSubmit, control } = useForm({
    defaultValues: {
      slug: "",
      skipDups: true,
    },
  });

  const onSubmit = handleSubmit((data) => {
    addToList.mutate(
      {
        slug: data.slug,
        skipDups: data.skipDups,
        collectionSlugs: selected.map((a) => a.slug),
      },
      {
        onSuccess: () => {
          setOpen(false);
        },
      },
    );
  });

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
    <Form onSubmit={onSubmit}>
      <div className="flex flex-col gap-4">
        <Controller
          control={control}
          name="slug"
          rules={{
            required: "List is required.",
          }}
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <Select
              placeholder="Select a list"
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isRequired
              isInvalid={invalid}
            >
              <Label>My List</Label>
              <SelectTrigger />
              <SelectContent>
                {data.map((item) => (
                  <SelectItem key={item.slug} id={item.slug} textValue={item.slug}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
              <FieldError>{error?.message}</FieldError>
            </Select>
          )}
        />
        <Controller
          control={control}
          name="skipDups"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox name={name} onChange={onChange} onBlur={onBlur} isSelected={value}>
              <Label>Prevent duplicate</Label>
              <Description>Skip the same objekt when adding</Description>
            </Checkbox>
          )}
        />
        <Portal to="#submit-form">
          <Button isPending={addToList.isPending} onPress={() => onSubmit()}>
            Add
          </Button>
        </Portal>
      </div>
    </Form>
  );
}

export function RemoveFromListModal({ open, setOpen }: ObjektActionModalProps) {
  const target = useTarget((a) => a.list)!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const removeObjektsFromList = useRemoveFromList();
  const reset = useObjektSelect((a) => a.reset);
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
          onPress={() => {
            removeObjektsFromList.mutate(
              {
                slug: target.slug,
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
      </ModalFooter>
    </ModalContent>
  );
}
