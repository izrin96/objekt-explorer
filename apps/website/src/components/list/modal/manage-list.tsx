import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  QueryErrorResetBoundary,
  useMutation,
  useSuspenseQueries,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense } from "react";
import { Form } from "react-aria-components/Form";
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
import { m } from "@/paraglide/messages";

type CreateListModalProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function CreateListModal({ open, setOpen }: CreateListModalProps) {
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{m.list_create_title()}</ModalTitle>
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
                <CreateListForm setOpen={setOpen} />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ModalBody>
      <ModalFooter id="submit-form-create-list">
        <ModalClose>{m.common_modal_cancel()}</ModalClose>
      </ModalFooter>
    </ModalContent>
  );
}

function CreateListForm({ setOpen }: { setOpen: (val: boolean) => void }) {
  const profiles = useUserProfiles();
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
        toast.success(m.list_create_success());
        return client.invalidateQueries({
          queryKey: orpc.user.currentUser.key(),
        });
      },
      onError: () => {
        toast.error(m.list_create_error());
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
            required: m.common_validation_required_name(),
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
              <Label>{m.common_form_name_label()}</Label>
              <Input placeholder={m.common_form_name_placeholder()} />
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
              <Label>{m.common_form_description_label()}</Label>
              <Textarea placeholder={m.list_create_description_placeholder()} rows={3} />
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
              aria-label={m.list_create_currency_label()}
              placeholder={m.common_form_none()}
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isInvalid={invalid}
              validationBehavior="aria"
            >
              <Label>{m.list_create_currency_label()}</Label>
              <Description>{m.list_create_currency_desc()}</Description>
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
              <Label>{m.list_create_list_type_label()}</Label>
              <Description>{m.list_create_list_type_desc()}</Description>
              <Radio value="normal">
                <Label>{m.list_create_normal_list_label()}</Label>
                <Description>{m.list_create_normal_list_desc()}</Description>
              </Radio>
              <Radio value="profile">
                <Label>{m.list_create_profile_list_label()}</Label>
                <Description>{m.list_create_profile_list_desc()}</Description>
              </Radio>
            </RadioGroup>
          )}
        />
        {(watchedListType === "profile" || watchedListType === "normal") && (
          <Controller
            control={control}
            name="profileAddress"
            rules={{
              required: watchedListType === "profile" ? m.list_create_profile_required() : false,
            }}
            render={({
              field: { name, value, onChange, onBlur },
              fieldState: { invalid, error },
            }) => (
              <Select
                aria-label={m.list_create_profile_label()}
                placeholder={m.list_create_profile_placeholder()}
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
                validationBehavior="aria"
                isRequired={watchedListType === "profile"}
              >
                <Label>{m.list_create_profile_label()}</Label>
                <Description>
                  {watchedListType === "profile"
                    ? m.list_create_profile_desc()
                    : m.list_create_display_profile_desc()}
                </Description>
                <SelectTrigger />
                <SelectContent>
                  {watchedListType === "normal" && (
                    <SelectItem id="" textValue={m.common_form_none()}>
                      {m.common_form_none()}
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
              <Label>{m.list_create_hide_user_label()}</Label>
              <Description>{m.list_create_hide_user_desc({ siteName: SITE_NAME })}</Description>
            </Checkbox>
          )}
        />

        <Portal to="#submit-form-create-list">
          <Button type="submit" isPending={createList.isPending} onPress={() => onSubmit()}>
            {m.common_actions_create()}
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
  const deleteList = useMutation(
    orpc.list.delete.mutationOptions({
      onSuccess: (_, _v, _o, { client }) => {
        setOpen(false);
        toast.success(m.list_delete_success());
        return client.invalidateQueries({
          queryKey: orpc.user.currentUser.key(),
        });
      },
      onError: () => {
        toast.error(m.list_delete_error());
      },
    }),
  );
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{m.list_delete_title()}</ModalTitle>
        <ModalDescription>{m.list_delete_description()}</ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>{m.common_modal_cancel()}</ModalClose>
        <Button
          intent="danger"
          type="submit"
          isPending={deleteList.isPending}
          onPress={() => deleteList.mutate({ slug })}
        >
          {m.common_actions_continue()}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

type EditListModalProps = {
  slug: string;
  open: boolean;
  setOpen: (val: boolean) => void;
  onSave?: () => void;
};

export function EditListModal({ slug, open, setOpen, onSave }: EditListModalProps) {
  return (
    <SheetContent className="sm:max-w-sm" isOpen={open} onOpenChange={setOpen}>
      <SheetHeader>
        <SheetTitle>{m.list_edit_title()}</SheetTitle>
        <SheetDescription>{m.list_edit_description()}</SheetDescription>
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
                <EditListForm slug={slug} setOpen={setOpen} onSave={onSave} />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </SheetBody>
      <SheetFooter id="submit-form-edit-list">
        <SheetClose>{m.common_modal_cancel()}</SheetClose>
      </SheetFooter>
    </SheetContent>
  );
}

function EditListForm({
  slug,
  setOpen,
  onSave,
}: {
  slug: string;
  setOpen: (val: boolean) => void;
  onSave?: () => void;
}) {
  const profiles = useUserProfiles();
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
      onSuccess: (_, _d, _o, { client }) => {
        setOpen(false);
        toast.success(m.list_edit_success());
        void client.invalidateQueries({
          queryKey: orpc.user.currentUser.key(),
        });
        onSave?.();
      },
      onError: () => {
        toast.error(m.list_edit_error());
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
            required: m.common_validation_required_name(),
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
              <Label>{m.common_form_name_label()}</Label>
              <Input placeholder={m.list_edit_name_placeholder()} />
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
              <Label>{m.common_form_description_label()}</Label>
              <Textarea placeholder={m.list_edit_description_placeholder()} rows={3} />
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
              aria-label={m.list_edit_currency_label()}
              placeholder={m.common_form_none()}
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isInvalid={invalid}
              validationBehavior="aria"
            >
              <Label>{m.list_edit_currency_label()}</Label>
              <Description>{m.list_edit_currency_desc()}</Description>
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
                aria-label={m.list_edit_display_profile_label()}
                placeholder={m.common_form_none()}
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
                validationBehavior="aria"
              >
                <Label>{m.list_edit_display_profile_label()}</Label>
                <Description>{m.list_edit_display_profile_desc()}</Description>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem id="" textValue={m.common_form_none()}>
                    {m.common_form_none()}
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
              <Label>{m.list_edit_hide_user_label()}</Label>
              <Description>{m.list_edit_hide_user_desc({ siteName: SITE_NAME })}</Description>
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
              aria-label={m.list_edit_objekt_columns_label()}
              placeholder={m.list_edit_objekt_columns_label()}
              name={name}
              value={`${value}`}
              onChange={(key) => onChange(Number(key))}
              onBlur={onBlur}
              isInvalid={invalid}
              validationBehavior="aria"
            >
              <Label>{m.list_edit_objekt_columns_label()}</Label>
              <Description>{m.list_edit_objekt_columns_desc()}</Description>
              <SelectTrigger className="w-[150px]" />
              <SelectContent>
                {[
                  { id: 0, name: m.list_edit_objekt_columns_not_set() },
                  ...validColumns.map((a) => ({
                    id: a,
                    name: m.list_edit_objekt_columns_count({ count: a }),
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
          <ParaglideMessage
            message={m.list_edit_delete_note}
            inputs={{}}
            markup={{
              link: (props) => (
                <Link to="/list" className="underline">
                  {props.children}
                </Link>
              ),
            }}
          />
        </span>

        <Portal to="#submit-form-edit-list">
          <Button isPending={editList.isPending} onPress={() => onSubmit()}>
            {m.common_actions_save()}
          </Button>
        </Portal>
      </div>
    </Form>
  );
}
