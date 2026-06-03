import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useState } from "react";
import { Form } from "react-aria-components/Form";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/intentui/button";
import { Checkbox, CheckboxLabel } from "@/components/intentui/checkbox";
import { Description, FieldError, Label } from "@/components/intentui/field";
import { ExternalLink } from "@/components/intentui/link";
import { Loader } from "@/components/intentui/loader";
import {
  ModalBody,
  ModalClose,
  ModalContent,
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
import { ListLabel } from "@/components/shared/list-label";
import Portal from "@/components/shared/portal";
import { useAddToList } from "@/hooks/actions/add-to-list";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { useUserLists } from "@/hooks/use-user";
import { m } from "@/paraglide/messages";

import ErrorFallbackRender from "../../router/error-boundary";
import { CreateListModal } from "./create-list-modal";

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
  const lists = useUserLists();
  const [createListOpen, setCreateListOpen] = useState(false);
  const addToList = useAddToList();
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const { handleSubmit, control } = useForm({
    defaultValues: {
      slug: "",
      skipDups: true,
    },
  });

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
        !list.isProfileBind || (list.isProfileBind && list.profileAddress === address.toLowerCase())
      );
    } else {
      return !list.isProfileBind;
    }
  });

  const onSubmit = handleSubmit((data) => {
    const selectedList = lists.find((l) => l.slug === data.slug);

    if (!selectedList) return;

    addToList.mutate(
      {
        slug: data.slug,
        skipDups: data.skipDups,
        objekts: selectedList.isProfileBind ? selected.map((a) => a.id) : undefined,
        collectionSlugs: !selectedList.isProfileBind ? selected.map((a) => a.slug) : undefined,
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
                      <ListLabel list={item} />
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
              <CheckboxLabel>{m.list_manage_objekt_skip_dups_label()}</CheckboxLabel>
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
