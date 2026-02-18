"use client";

import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Form } from "react-aria-components";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { useShallow } from "zustand/react/shallow";

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

export function AddToListModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (val: boolean) => void;
}) {
  const t = useTranslations("list.manage_objekt");
  const tCommon = useTranslations("common.modal");
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{t("add_title")}</ModalTitle>
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
        <ModalClose>{tCommon("cancel")}</ModalClose>
      </ModalFooter>
    </ModalContent>
  );
}

function AddToListForm({ setOpen }: { setOpen: (val: boolean) => void }) {
  const { data } = useSuspenseQuery(orpc.list.list.queryOptions());
  const addToList = useAddToList();
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const t = useTranslations("list.manage_objekt");

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
        {t("no_list_message")}{" "}
        <Link className="underline" href="/list">
          {t("create_one_here")}
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
            required: t("list_required"),
          }}
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <Select
              placeholder={t("list_placeholder")}
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isRequired
              isInvalid={invalid}
            >
              <Label>{t("list_label")}</Label>
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
              <Label>{t("skip_dups_label")}</Label>
              <Description>{t("skip_dups_desc")}</Description>
            </Checkbox>
          )}
        />
        <Portal to="#submit-form">
          <Button isPending={addToList.isPending} onPress={() => onSubmit()}>
            {t("add_button")}
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
  const target = useTarget((a) => a.list)!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const removeObjektsFromList = useRemoveFromList();
  const reset = useObjektSelect((a) => a.reset);
  const t = useTranslations("list.manage_objekt");
  const tCommon = useTranslations("common.modal");
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{t("remove_title")}</ModalTitle>
        <ModalDescription>{t("remove_description")}</ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>{tCommon("cancel")}</ModalClose>

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
          {t("continue_button")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
