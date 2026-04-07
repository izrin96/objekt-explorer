"use client";

import {
  QueryErrorResetBoundary,
  useMutation,
  useSuspenseQueries,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { Form } from "react-aria-components";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import ErrorFallbackRender from "@/components/error-boundary";
import { Button } from "@/components/intentui/button";
import { Checkbox } from "@/components/intentui/checkbox";
import { Description, FieldError, Label } from "@/components/intentui/field";
import { Input } from "@/components/intentui/input";
import { Link } from "@/components/intentui/link";
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
import { Radio, RadioGroup } from "@/components/intentui/radio";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/intentui/select";
import {
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/intentui/sheet";
import { TextField } from "@/components/intentui/text-field";
import { Textarea } from "@/components/intentui/textarea";
import Portal from "@/components/portal";
import { useUserProfiles } from "@/hooks/use-user";
import { orpc } from "@/lib/orpc/client";
import { parseNickname, SITE_NAME, validColumns } from "@/lib/utils";

type CreateListModalProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function CreateListModal({ open, setOpen }: CreateListModalProps) {
  const content = useIntlayer("list");
  const contentCommon = useIntlayer("common");

  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{content.create.title.value}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <CreateListForm setOpen={setOpen} />
      </ModalBody>
      <ModalFooter id="submit-form-create-list">
        <ModalClose>{contentCommon.modal.cancel.value}</ModalClose>
      </ModalFooter>
    </ModalContent>
  );
}

function CreateListForm({ setOpen }: { setOpen: (val: boolean) => void }) {
  const content = useIntlayer("list");
  const contentCommon = useIntlayer("common");
  const { data: profiles } = useUserProfiles();
  const { data: currencies } = useSuspenseQuery(orpc.meta.supportedCurrencies.queryOptions());
  const { handleSubmit, control, watch } = useForm({
    defaultValues: {
      name: "",
      description: "",
      currency: "",
      hideUser: true,
      listType: "normal" as "normal" | "profile",
      profileAddress: "",
    },
  });

  const watchedListType = watch("listType");

  const createList = useMutation(
    orpc.list.create.mutationOptions({
      onSuccess: (_, _v, _o, { client }) => {
        setOpen(false);
        toast.success(content.create.success.value);
        return client.invalidateQueries({
          queryKey: orpc.list.list.key(),
        });
      },
      onError: () => {
        toast.error(content.create.error.value);
      },
    }),
  );

  const onSubmit = handleSubmit((data) => {
    createList.mutate({
      name: data.name,
      description: data.description || null,
      currency: data.currency || null,
      hideUser: data.hideUser,
      listType: data.listType,
      profileAddress: data.profileAddress || undefined,
    });
  });

  return (
    <Form onSubmit={onSubmit} validationBehavior="aria">
      <div className="flex flex-col gap-6">
        <Controller
          control={control}
          name="name"
          rules={{
            required: contentCommon.validation.required_name.value,
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
              validationBehavior="aria"
            >
              <Label>{contentCommon.form.name.label.value}</Label>
              <Input placeholder={contentCommon.form.name.placeholder.value} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <TextField
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              validationBehavior="aria"
            >
              <Label>{contentCommon.form.description.label.value}</Label>
              <Textarea placeholder={content.create.description_placeholder.value} rows={3} />
            </TextField>
          )}
        />
        <Controller
          control={control}
          name="currency"
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <Select
              aria-label={content.create.currency_label.value}
              placeholder={contentCommon.form.none.value}
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isInvalid={invalid}
              validationBehavior="aria"
            >
              <Label>{content.create.currency_label.value}</Label>
              <Description>{content.create.currency_desc.value}</Description>
              <SelectTrigger />
              <SelectContent>
                <SelectItem id="" textValue="None">
                  None
                </SelectItem>
                {currencies.map((currency) => (
                  <SelectItem key={currency} id={currency} textValue={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
              <FieldError>{error?.message}</FieldError>
            </Select>
          )}
        />
        <Controller
          control={control}
          name="listType"
          render={({ field: { name, value, onChange } }) => (
            <RadioGroup name={name} value={value} onChange={onChange} validationBehavior="aria">
              <Label>{content.create.list_type_label.value}</Label>
              <Description>{content.create.list_type_desc.value}</Description>
              <Radio value="normal">
                <Label>{content.create.normal_list_label.value}</Label>
                <Description>{content.create.normal_list_desc.value}</Description>
              </Radio>
              <Radio value="profile">
                <Label>{content.create.profile_list_label.value}</Label>
                <Description>{content.create.profile_list_desc.value}</Description>
              </Radio>
            </RadioGroup>
          )}
        />
        {(watchedListType === "profile" || watchedListType === "normal") && (
          <Controller
            control={control}
            name="profileAddress"
            rules={{
              required:
                watchedListType === "profile" ? content.create.profile_required.value : false,
            }}
            render={({
              field: { name, value, onChange, onBlur },
              fieldState: { invalid, error },
            }) => (
              <Select
                aria-label={content.create.profile_label.value}
                placeholder={content.create.profile_placeholder.value}
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
                validationBehavior="aria"
              >
                <Label>{content.create.profile_label.value}</Label>
                <Description>
                  {watchedListType === "profile"
                    ? content.create.profile_desc.value
                    : content.create.display_profile_desc.value}
                </Description>
                <SelectTrigger />
                <SelectContent>
                  {watchedListType === "normal" && (
                    <SelectItem id="" textValue={contentCommon.form.none.value}>
                      {contentCommon.form.none.value}
                    </SelectItem>
                  )}
                  {profiles?.map((profile) => (
                    <SelectItem
                      key={profile.address.toLowerCase()}
                      id={profile.address.toLowerCase()}
                      textValue={parseNickname(profile.address, profile.nickname)}
                    >
                      {parseNickname(profile.address, profile.nickname)}
                    </SelectItem>
                  ))}
                </SelectContent>
                <FieldError>{error?.message}</FieldError>
              </Select>
            )}
          />
        )}
        <Controller
          control={control}
          name="hideUser"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox
              name={name}
              isSelected={value}
              onChange={onChange}
              onBlur={onBlur}
              validationBehavior="aria"
            >
              <Label>{content.create.hide_user_label.value}</Label>
              <Description>
                {content.create.hide_user_desc({ siteName: SITE_NAME }).value}
              </Description>
            </Checkbox>
          )}
        />

        <Portal to="#submit-form-create-list">
          <Button type="submit" isPending={createList.isPending} onPress={() => onSubmit()}>
            {contentCommon.actions.create.value}
          </Button>
        </Portal>
      </div>
    </Form>
  );
}

type DeleteListModalProps = {
  slug: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function DeleteListModal({ slug, open, setOpen }: DeleteListModalProps) {
  const content = useIntlayer("list");
  const contentCommon = useIntlayer("common");
  const deleteList = useMutation(
    orpc.list.delete.mutationOptions({
      onSuccess: (_, _v, _o, { client }) => {
        setOpen(false);
        toast.success(content.delete.success.value);
        return client.invalidateQueries({
          queryKey: orpc.list.list.key(),
        });
      },
      onError: () => {
        toast.error(content.delete.error.value);
      },
    }),
  );
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{content.delete.title.value}</ModalTitle>
        <ModalDescription>{content.delete.description.value}</ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>{contentCommon.modal.cancel.value}</ModalClose>
        <Button
          intent="danger"
          type="submit"
          isPending={deleteList.isPending}
          onPress={() => deleteList.mutate({ slug })}
        >
          {contentCommon.actions.continue.value}
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
  const content = useIntlayer("list");
  const contentCommon = useIntlayer("common");
  return (
    <SheetContent className="sm:max-w-sm" isOpen={open} onOpenChange={setOpen}>
      <SheetHeader>
        <SheetTitle>{content.edit.title.value}</SheetTitle>
        <SheetDescription>{content.edit.description.value}</SheetDescription>
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
      <SheetFooter id="submit-form-edit-list">
        <SheetClose>{contentCommon.modal.cancel.value}</SheetClose>
      </SheetFooter>
    </SheetContent>
  );
}

function EditListForm({ slug, setOpen }: { slug: string; setOpen: (val: boolean) => void }) {
  const router = useRouter();
  const content = useIntlayer("list");
  const contentCommon = useIntlayer("common");
  const { data: profiles } = useUserProfiles();
  const [{ data: currencies }, { data }] = useSuspenseQueries({
    queries: [
      orpc.meta.supportedCurrencies.queryOptions(),
      orpc.list.find.queryOptions({
        input: slug,
        staleTime: 0,
      }),
    ],
  });
  const editList = useMutation(
    orpc.list.edit.mutationOptions({
      onSuccess: (_, { slug }, _o, { client }) => {
        setOpen(false);
        toast.success(content.edit.success.value);
        router.replace(`/list/${slug}`);
        void client.invalidateQueries({
          queryKey: orpc.list.list.key(),
        });
      },
      onError: () => {
        toast.error(content.edit.error.value);
      },
    }),
  );

  const values = {
    name: data.name,
    description: data.description ?? "",
    currency: data.currency ?? "",
    hideUser: data.hideUser ?? false,
    gridColumns: data.gridColumns ?? 0,
    profileAddress: data.profileAddress ?? "",
  };

  const { handleSubmit, control } = useForm({
    defaultValues: values,
    values: values,
  });

  const onSubmit = handleSubmit((data) => {
    editList.mutate({
      slug,
      name: data.name,
      description: data.description || null,
      currency: data.currency || null,
      hideUser: data.hideUser,
      gridColumns: data.gridColumns === 0 ? null : data.gridColumns,
      profileAddress: data.profileAddress === "" ? null : data.profileAddress,
    });
  });

  return (
    <Form onSubmit={onSubmit} validationBehavior="aria">
      <div className="flex flex-col gap-6">
        <Controller
          control={control}
          name="name"
          rules={{
            required: contentCommon.validation.required_name.value,
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
              validationBehavior="aria"
            >
              <Label>{contentCommon.form.name.label.value}</Label>
              <Input placeholder={content.edit.name_placeholder.value} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <TextField
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              validationBehavior="aria"
            >
              <Label>{contentCommon.form.description.label.value}</Label>
              <Textarea placeholder={content.edit.description_placeholder.value} rows={3} />
            </TextField>
          )}
        />

        <Controller
          control={control}
          name="currency"
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <Select
              aria-label={content.edit.currency_label.value}
              placeholder={contentCommon.form.none.value}
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isInvalid={invalid}
              validationBehavior="aria"
            >
              <Label>{content.edit.currency_label.value}</Label>
              <Description>{content.edit.currency_desc.value}</Description>
              <SelectTrigger />
              <SelectContent>
                <SelectItem id="" textValue="None">
                  None
                </SelectItem>
                {currencies.map((currency) => (
                  <SelectItem key={currency} id={currency} textValue={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
              <FieldError>{error?.message}</FieldError>
            </Select>
          )}
        />

        {data.listType === "normal" && (
          <Controller
            control={control}
            name="profileAddress"
            render={({
              field: { name, value, onChange, onBlur },
              fieldState: { invalid, error },
            }) => (
              <Select
                aria-label={content.edit.display_profile_label.value}
                placeholder={contentCommon.form.none.value}
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
                validationBehavior="aria"
              >
                <Label>{content.edit.display_profile_label.value}</Label>
                <Description>{content.edit.display_profile_desc.value}</Description>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem id="" textValue={contentCommon.form.none.value}>
                    {contentCommon.form.none.value}
                  </SelectItem>
                  {profiles?.map((profile) => (
                    <SelectItem
                      key={profile.address.toLowerCase()}
                      id={profile.address.toLowerCase()}
                      textValue={parseNickname(profile.address, profile.nickname)}
                    >
                      {parseNickname(profile.address, profile.nickname)}
                    </SelectItem>
                  ))}
                </SelectContent>
                <FieldError>{error?.message}</FieldError>
              </Select>
            )}
          />
        )}

        <Controller
          control={control}
          name="hideUser"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <Checkbox
              name={name}
              isSelected={value}
              onChange={onChange}
              onBlur={onBlur}
              validationBehavior="aria"
            >
              <Label>{content.edit.hide_user_label.value}</Label>
              <Description>
                {content.edit.hide_user_desc({ siteName: SITE_NAME }).value}
              </Description>
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
              aria-label={content.edit.objekt_columns_label.value}
              placeholder={content.edit.objekt_columns_label.value}
              name={name}
              value={`${value}`}
              onChange={(key) => onChange(Number(key))}
              onBlur={onBlur}
              isInvalid={invalid}
              validationBehavior="aria"
            >
              <Label>{content.edit.objekt_columns_label.value}</Label>
              <Description>{content.edit.objekt_columns_desc.value}</Description>
              <SelectTrigger className="w-[150px]" />
              <SelectContent>
                {[
                  { id: 0, name: content.edit.objekt_columns_not_set.value },
                  ...validColumns.map((a) => ({
                    id: a,
                    name: content.edit.objekt_columns_count({ count: a }).value,
                  })),
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
          {content.edit.delete_note.use({
            link: (props) => (
              <Link href="/link" className="underline">
                {props.children}
              </Link>
            ),
          })}
        </span>

        <Portal to="#submit-form-edit-list">
          <Button isPending={editList.isPending} onPress={() => onSubmit()}>
            {contentCommon.actions.save.value}
          </Button>
        </Portal>
      </div>
    </Form>
  );
}
