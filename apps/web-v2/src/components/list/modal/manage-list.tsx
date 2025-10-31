import {
  QueryErrorResetBoundary,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import ErrorFallbackRender from "@/components/error-boundary";
import Portal from "@/components/portal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Description, FieldError, Label } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { orpc } from "@/lib/orpc/client";
import { validColumns } from "@/lib/utils";

type CreateListModalProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function CreateListModal({ open, setOpen }: CreateListModalProps) {
  const queryClient = useQueryClient();
  const { handleSubmit, control } = useForm({
    defaultValues: {
      name: "",
      hideUser: true,
    },
  });

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

  const onSubmit = handleSubmit((data) => {
    createList.mutate({
      name: data.name,
      hideUser: data.hideUser,
    });
  });

  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>Create list</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <Form onSubmit={onSubmit}>
          <div className="flex flex-col gap-6">
            <Controller
              control={control}
              name="name"
              rules={{
                required: "Name is required.",
              }}
              render={({
                field: { name, value, onChange, onBlur },
                fieldState: { invalid, error },
              }) => (
                <TextField
                  isRequired
                  autoFocus
                  name={name}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  isInvalid={invalid}
                >
                  <Label>Name</Label>
                  <Input placeholder="My list" />
                  <FieldError>{error?.message}</FieldError>
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="hideUser"
              render={({ field: { name, value, onChange, onBlur } }) => (
                <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
                  <Label>Hide User</Label>
                  <Description>Hide Objekt Tracker account from this list</Description>
                </Checkbox>
              )}
            />
          </div>
        </Form>
      </ModalBody>
      <ModalFooter>
        <ModalClose>Cancel</ModalClose>
        <Button type="submit" isPending={createList.isPending} onClick={onSubmit}>
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
  return (
    <SheetContent className="sm:max-w-sm" isOpen={open} onOpenChange={setOpen}>
      <SheetHeader>
        <SheetTitle>Edit list</SheetTitle>
        <SheetDescription>Manage your list</SheetDescription>
      </SheetHeader>
      <SheetBody>
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
                <EditListForm slug={slug} setOpen={setOpen} />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </SheetBody>
      <SheetFooter id="submit-form">
        <SheetClose>Cancel</SheetClose>
      </SheetFooter>
    </SheetContent>
  );
}

function EditListForm({ slug, setOpen }: { slug: string; setOpen: (val: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(
    orpc.list.find.queryOptions({
      input: { slug },
      staleTime: 0,
    }),
  );
  const editList = useMutation(
    orpc.list.edit.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        toast.success("List updated");
        queryClient.invalidateQueries({
          queryKey: orpc.list.findPublic.key({ input: { slug } }),
        });
      },
      onError: () => {
        toast.error("Error editing list");
      },
    }),
  );

  const values = {
    name: data.name,
    hideUser: data.hideUser ?? false,
    gridColumns: data.gridColumns ?? 0,
  };

  const { handleSubmit, control } = useForm({
    defaultValues: values,
    values: values,
  });

  const onSubmit = handleSubmit((data) => {
    editList.mutate({
      slug,
      name: data.name,
      hideUser: data.hideUser,
      gridColumns: data.gridColumns === 0 ? null : data.gridColumns,
    });
  });

  return (
    <Form onSubmit={onSubmit}>
      <div className="flex flex-col gap-6">
        <Controller
          control={control}
          name="name"
          rules={{
            required: "Name is required.",
          }}
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <TextField
              isRequired
              autoFocus
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isInvalid={invalid}
            >
              <Label>Name</Label>
              <Input placeholder="My list" />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />

        <Controller
          control={control}
          name="hideUser"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox name={name} isSelected={value} onChange={onChange} onBlur={onBlur}>
              <Label>Hide User</Label>
              <Description>Hide Objekt Tracker account from this list</Description>
            </Checkbox>
          )}
        />

        <Controller
          control={control}
          name="gridColumns"
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <Select
              aria-label="Objekt Columns"
              placeholder="Objekt Columns"
              name={name}
              value={`${value}`}
              onChange={(key) => onChange(Number(key))}
              onBlur={onBlur}
              isInvalid={invalid}
            >
              <Label>Objekt Columns</Label>
              <Description>
                Number of columns to use on visit. Visitor are still allowed to change to any
                columns they want. Pro tips: can also override using URL params (?column=).
              </Description>
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
              <FieldError>{error?.message}</FieldError>
            </Select>
          )}
        />

        <span className="text-muted-fg text-sm">
          To delete this list, visit{" "}
          <Link to="/list" className="underline">
            Manage list
          </Link>{" "}
          page.
        </span>

        <Portal to="#submit-form">
          <Button isPending={editList.isPending} onClick={onSubmit}>
            Save
          </Button>
        </Portal>
      </div>
    </Form>
  );
}
