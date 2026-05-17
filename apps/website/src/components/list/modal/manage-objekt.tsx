import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useState } from "react";
import { Form } from "react-aria-components/Form";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/intentui/button";
import { Checkbox } from "@/components/intentui/checkbox";
import { Description, FieldError, Label } from "@/components/intentui/field";
import { ExternalLink } from "@/components/intentui/link";
import { Loader } from "@/components/intentui/loader";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/intentui/modal";
import { Note } from "@/components/intentui/note";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/intentui/select";
import Portal from "@/components/portal";
import { useAddToList } from "@/hooks/actions/add-to-list";
import { useRemoveFromList } from "@/hooks/actions/remove-from-list";
import { useListTarget } from "@/hooks/use-list-target";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useSession, useUserLists } from "@/hooks/use-user";
import { parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import ErrorFallbackRender from "../../error-boundary";
import { CreateListModal } from "./manage-list";

export function AddToListModal({
  open,
  setOpen,
  address,
}: {
  open: boolean;
  setOpen: (val: boolean) => void;
  address?: string;
}) {
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{m.list_manage_objekt_add_title()}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
              <AddToListForm setOpen={setOpen} address={address} />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ModalBody>
      <ModalFooter id="submit-form-add-to-list">
        <ModalClose>{m.common_modal_cancel()}</ModalClose>
      </ModalFooter>
    </ModalContent>
  );
}

function AddToListForm({
  setOpen,
  address,
}: {
  setOpen: (val: boolean) => void;
  address?: string;
}) {
  const { data: session } = useSession();
  const { data: lists } = useUserLists();
  const [createListOpen, setCreateListOpen] = useState(false);
  const addToList = useAddToList();
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const { handleSubmit, control } = useForm({
    defaultValues: {
      slug: "",
      skipDups: true,
    },
  });

  if (!session) {
    return <div className="flex justify-center">{m.list_manage_objekt_sign_in_message()}</div>;
  }

  if (!lists) {
    return (
      <div className="flex justify-center">
        <Loader variant="ring" />
      </div>
    );
  }

  const availableLists = lists.filter((list) => {
    if (address) {
      return (
        list.listType === "normal" ||
        (list.listType === "profile" && list.profileAddress === address.toLowerCase())
      );
    } else {
      return list.listType === "normal";
    }
  });

  const onSubmit = handleSubmit((data) => {
    const selectedList = lists.find((l) => l.slug === data.slug);

    addToList.mutate(
      {
        slug: data.slug,
        skipDups: data.skipDups,
        objekts: selectedList?.listType === "profile" ? selected.map((a) => a.id) : undefined,
        collectionSlugs:
          selectedList?.listType === "normal" ? selected.map((a) => a.slug) : undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
        },
      },
    );
  });

  if (availableLists.length === 0)
    return (
      <>
        <CreateListModal open={createListOpen} setOpen={setCreateListOpen} />
        <Note intent="default">
          {m.list_manage_objekt_no_list_message()}{" "}
          <ExternalLink
            className="cursor-pointer underline"
            onPress={() => setCreateListOpen(true)}
          >
            {m.list_manage_objekt_create_one_here()}
          </ExternalLink>
          .
        </Note>
      </>
    );

  return (
    <Form onSubmit={onSubmit} validationBehavior="aria">
      <div className="flex flex-col gap-4">
        <Controller
          control={control}
          name="slug"
          rules={{
            required: m.list_manage_objekt_list_required(),
          }}
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <Select
              placeholder={m.list_manage_objekt_list_placeholder()}
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isRequired
              isInvalid={invalid}
              validationBehavior="aria"
            >
              <Label>{m.list_manage_objekt_list_label()}</Label>
              <SelectTrigger />
              <SelectContent>
                {availableLists.map((item) => (
                  <SelectItem key={item.slug} id={item.slug} textValue={item.slug}>
                    <SelectLabel>
                      {item.name}{" "}
                      {item.profileAddress && (
                        <span className="text-muted-fg text-xs">
                          ({parseNickname(item.profileAddress, item.nickname)})
                        </span>
                      )}
                    </SelectLabel>
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
            <Checkbox
              name={name}
              onChange={onChange}
              onBlur={onBlur}
              isSelected={value}
              validationBehavior="aria"
            >
              <Label>{m.list_manage_objekt_skip_dups_label()}</Label>
              <Description>{m.list_manage_objekt_skip_dups_desc()}</Description>
            </Checkbox>
          )}
        />
        <Portal to="#submit-form-add-to-list">
          <Button isPending={addToList.isPending} onPress={() => onSubmit()}>
            {m.list_manage_objekt_add_button()}
          </Button>
        </Portal>
      </div>
    </Form>
  );
}

export function RemoveFromListModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (val: boolean) => void;
}) {
  const target = useListTarget()!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const removeObjektsFromList = useRemoveFromList();
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{m.list_manage_objekt_remove_title()}</ModalTitle>
        <ModalDescription>{m.list_manage_objekt_remove_description()}</ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>{m.common_modal_cancel()}</ModalClose>

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
                },
              },
            );
          }}
        >
          {m.common_actions_continue()}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
