import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { createContext, Suspense, use, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { useShallow } from "zustand/react/shallow";
import Portal from "@/components/portal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Description, FieldError, Label } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSection,
  SelectTrigger,
} from "@/components/ui/select";
import { useAddToList, useAddToProfileList } from "@/hooks/actions/add-to-list";
import { useRemoveFromList, useRemoveFromProfileList } from "@/hooks/actions/remove-from-list";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useTarget } from "@/hooks/use-target";
import { orpc } from "@/lib/orpc/client";
import ErrorFallbackRender from "../../error-boundary";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export const ObjektActionContext = createContext({
  showProfileList: false,
  address: "",
});

export function AddToListModal({ open, setOpen }: Props) {
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

function AddToListForm({ setOpen }: Pick<Props, "setOpen">) {
  const [isProfile, setIsProfile] = useState(false);
  const { showProfileList, address } = use(ObjektActionContext);
  const { data } = useSuspenseQuery(
    orpc.list.listCombined.queryOptions({
      input: { includeProfile: showProfileList, address: address },
    }),
  );
  const addToList = useAddToList();
  const addToProfileList = useAddToProfileList();
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));

  const { handleSubmit, control } = useForm({
    defaultValues: {
      slug: "",
      skipDups: true,
    },
  });

  const onSubmit = handleSubmit((formData) => {
    if (isProfile) {
      return addToProfileList.mutate(
        {
          slug: formData.slug,
          objektIds: selected.map((a) => a.id),
        },
        {
          onSuccess: () => {
            setOpen(false);
          },
        },
      );
    }

    addToList.mutate(
      {
        slug: formData.slug,
        skipDups: formData.skipDups,
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
        <Link className="underline" to="/list">
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
              onChange={(e) => {
                const isProfile = data.find((a) => a.slug === e)?.type === "profile";
                setIsProfile(isProfile);
                onChange(e);
              }}
              onBlur={onBlur}
              isRequired
              isInvalid={invalid}
            >
              <Label>My List</Label>
              <SelectTrigger />
              <SelectContent>
                <SelectSection title="Normal list">
                  {data.length === 0 && (
                    <SelectItem isDisabled>
                      <SelectLabel>No list found</SelectLabel>
                    </SelectItem>
                  )}
                  {data
                    .filter((a) => a.type === "normal")
                    .map((item) => (
                      <SelectItem key={item.slug} id={item.slug} textValue={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectSection>
                {showProfileList && (
                  <SelectSection title="Profile list">
                    {data
                      .filter((a) => a.type === "profile")
                      .map((item) => (
                        <SelectItem key={item.slug} id={item.slug} textValue={item.name}>
                          {item.name}
                        </SelectItem>
                      ))}
                  </SelectSection>
                )}
              </SelectContent>
              <FieldError>{error?.message}</FieldError>
            </Select>
          )}
        />
        <Controller
          control={control}
          name="skipDups"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox
              name={name}
              onChange={onChange}
              onBlur={onBlur}
              isSelected={value}
              isDisabled={isProfile}
            >
              <Label>Prevent duplicate</Label>
              <Description>Skip the same objekt when adding</Description>
            </Checkbox>
          )}
        />
        <Portal to="#submit-form">
          <Button isPending={addToList.isPending || addToProfileList.isPending} onClick={onSubmit}>
            Add
          </Button>
        </Portal>
      </div>
    </Form>
  );
}

function RemoveFromListModalBase({
  open,
  setOpen,
  isPending,
  onSubmit,
}: Props & {
  isPending: boolean;
  onSubmit: () => void;
}) {
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
        <Button intent="danger" type="submit" isPending={isPending} onClick={onSubmit}>
          Continue
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export function RemoveFromListModal({ open, setOpen }: Props) {
  const target = useTarget((a) => a.list)!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const removeObjekts = useRemoveFromList();
  const reset = useObjektSelect((a) => a.reset);

  return (
    <RemoveFromListModalBase
      open={open}
      setOpen={setOpen}
      isPending={removeObjekts.isPending}
      onSubmit={() =>
        removeObjekts.mutate(
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
        )
      }
    />
  );
}

export function RemoveFromProfileListModal({ open, setOpen }: Props) {
  const target = useTarget((a) => a.profileList)!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const removeObjekts = useRemoveFromProfileList();
  const reset = useObjektSelect((a) => a.reset);

  return (
    <RemoveFromListModalBase
      open={open}
      setOpen={setOpen}
      isPending={removeObjekts.isPending}
      onSubmit={() =>
        removeObjekts.mutate(
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
        )
      }
    />
  );
}
