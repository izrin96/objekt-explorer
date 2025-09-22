"use client";

import {
  QueryErrorResetBoundary,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import ErrorFallbackRender from "@/components/error-boundary";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  TextField,
} from "@/components/ui";
import { orpc } from "@/lib/orpc/client";
import { validColumns } from "@/lib/utils";

type CreateListModalProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function CreateListModal({ open, setOpen }: CreateListModalProps) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null!);
  const createList = useMutation(
    orpc.list.create.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        toast.success("List created");
        queryClient.invalidateQueries({
          queryKey: orpc.list.list.key(),
        });
      },
      onError: () => {
        toast.error("Error creating list");
      },
    }),
  );
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>Create list</ModalTitle>
      </ModalHeader>
      <ModalBody>
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
            <TextField isRequired autoFocus label="Name" placeholder="My list" name="name" />
            <Checkbox
              label="Hide User"
              name="hideUser"
              description="Hide Objekt Tracker account from this list"
              defaultSelected={true}
            />
          </div>
        </Form>
      </ModalBody>
      <ModalFooter>
        <ModalClose>Cancel</ModalClose>
        <Button
          type="submit"
          isPending={createList.isPending}
          onClick={() => formRef.current.requestSubmit()}
        >
          Create
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

type DeleteListModalProps = {
  slug: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function DeleteListModal({ slug, open, setOpen }: DeleteListModalProps) {
  const queryClient = useQueryClient();
  const deleteList = useMutation(
    orpc.list.delete.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        toast.success("List deleted");
        queryClient.invalidateQueries({
          queryKey: orpc.list.list.key(),
        });
      },
      onError: () => {
        toast.error("Error deleting list");
      },
    }),
  );
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>Delete list</ModalTitle>
        <ModalDescription>
          This will permanently delete the selected list. Continue?
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>Cancel</ModalClose>
        <Button
          intent="danger"
          type="submit"
          isPending={deleteList.isPending}
          onClick={() => deleteList.mutate({ slug })}
        >
          Continue
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

type EditListModalProps = {
  slug: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function EditListModal({ slug, open, setOpen }: EditListModalProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null!);
  const editList = useMutation(
    orpc.list.edit.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        toast.success("List updated");
        router.refresh();
      },
      onError: () => {
        toast.error("Error editing list");
      },
    }),
  );

  useEffect(() => {
    if (!open) {
      queryClient.removeQueries({
        queryKey: orpc.list.find.key({
          input: slug,
        }),
      });
    }
  }, [open]);

  return (
    <SheetContent isOpen={open} onOpenChange={setOpen}>
      <SheetHeader>
        <SheetTitle>Edit list</SheetTitle>
        <SheetDescription>Manage your list</SheetDescription>
      </SheetHeader>
      <SheetBody>
        <Form
          ref={formRef}
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const gridColumns = Number(formData.get("gridColumns") as string);
            editList.mutate({
              slug,
              name: formData.get("name") as string,
              hideUser: formData.get("hideUser") === "on",
              gridColumns: gridColumns === 0 ? null : gridColumns,
            });
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
                  <EditListForm slug={slug} />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </Form>
      </SheetBody>
      <SheetFooter>
        <SheetClose>Cancel</SheetClose>
        <Button
          onClick={() => formRef.current.requestSubmit()}
          type="submit"
          isPending={editList.isPending}
        >
          Save
        </Button>
      </SheetFooter>
    </SheetContent>
  );
}

function EditListForm({ slug }: { slug: string }) {
  const { data } = useSuspenseQuery(
    orpc.list.find.queryOptions({
      input: slug,
    }),
  );
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

      <Select
        aria-label="Objekt Columns"
        placeholder="Objekt Columns"
        label="Objekt Columns"
        description="Number of columns to use on visit. Visitor are still allowed to change to any columns they want. Pro tips: can also override using URL params (?column=)."
        defaultSelectedKey={`${data.gridColumns ?? 0}`}
        name="gridColumns"
      >
        <SelectTrigger className="w-[150px]" />
        <SelectContent>
          {[
            { id: 0, name: "Not set" },
            ...validColumns.map((a) => ({ id: a, name: `${a} columns` })),
          ].map((item) => (
            <SelectItem key={item.id} id={`${item.id}`} textValue={item.name}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
