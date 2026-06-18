import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { QueryErrorResetBoundary, useMutation, useSuspenseQueries } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Suspense } from "react";
import { Form } from "react-aria-components/Form";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/intentui/button";
import { Checkbox, CheckboxField } from "@/components/intentui/checkbox";
import { Description, FieldError, Label } from "@/components/intentui/field";
import { Input } from "@/components/intentui/input";
import { Link } from "@/components/intentui/link";
import { Loader } from "@/components/intentui/loader";
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
import { Switch, SwitchField } from "@/components/intentui/switch";
import { TextField } from "@/components/intentui/text-field";
import { Textarea } from "@/components/intentui/textarea";
import ErrorFallbackRender from "@/components/router/error-boundary";
import Portal from "@/components/shared/portal";
import { useUserProfiles, useUserLists } from "@/hooks/use-user";
import { orpc } from "@/lib/orpc/client";
import { parseNickname, SITE_NAME, validColumns } from "@/lib/utils";
import { m } from "@/paraglide/messages";

type EditListModalProps = {
  slug: string;
  open: boolean;
  setOpen: (val: boolean) => void;
  redirectOnSave?: boolean;
};

export function EditListModal({ slug, open, setOpen, redirectOnSave }: EditListModalProps) {
  return (
    <SheetContent className="sm:max-w-md" isOpen={open} onOpenChange={setOpen}>
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
                <EditListForm slug={slug} setOpen={setOpen} redirectOnSave={redirectOnSave} />
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
  redirectOnSave,
}: {
  slug: string;
  setOpen: (val: boolean) => void;
  redirectOnSave?: boolean;
}) {
  const router = useRouter();
  const profiles = useUserProfiles();
  const userLists = useUserLists();
  const [{ data: currencies }, { data }] = useSuspenseQueries({
    queries: [
      orpc.meta.supportedCurrencies.queryOptions(),
      orpc.list.find.queryOptions({
        input: {
          slug,
        },
        staleTime: 0,
      }),
    ],
  });
  const editList = useMutation(
    orpc.list.edit.mutationOptions({
      onSuccess: (result, _d, _o, { client }) => {
        setOpen(false);
        toast.success(m.list_edit_success());
        void client.invalidateQueries({
          queryKey: orpc.user.currentUser.key(),
        });
        void client.invalidateQueries({
          queryKey: ["list"],
        });

        if (redirectOnSave && result) {
          void router.navigate({
            to: result.to,
            params: result.params,
            replace: true,
          });
        }
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
    isProfileBind: data.isProfileBind,
    hideSerial: data.hideSerial,
    discoverable: data.discoverable ?? false,
    linkedListId: data.linkedListId ? String(data.linkedListId) : "",
  };

  const { handleSubmit, control } = useForm({
    defaultValues: values,
    values: values,
  });

  // Filter linked list options based on opposite type
  const linkedListOptions = userLists.filter((l) => {
    if (data.listTypeNew === "have") return l.listTypeNew === "want";
    if (data.listTypeNew === "want") return l.listTypeNew === "have";
    return false;
  });

  const onSubmit = handleSubmit((data) => {
    editList.mutate({
      slug,
      name: data.name,
      description: data.description || null,
      currency: data.currency || null,
      hideUser: data.hideUser,
      gridColumns: data.gridColumns === 0 ? null : data.gridColumns,
      profileAddress: data.profileAddress || null,
      hideSerial: data.hideSerial,
      discoverable: data.discoverable,
      linkedListId: data.linkedListId ? Number(data.linkedListId) : null,
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
              <Label>{m.list_create_name_label()}</Label>
              <Input placeholder={m.list_create_name_placeholder()} />
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
              <Label>{m.list_create_description_label()}</Label>
              <Textarea placeholder={m.list_create_description_placeholder()} rows={3} />
            </TextField>
          )}
        />

        {data.listTypeNew === "sale" && (
          <Controller
            control={control}
            name="currency"
            rules={{
              required: m.common_validation_required(),
            }}
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
                isRequired
              >
                <Label>{m.list_create_currency_label()}</Label>
                <Description>{m.list_create_currency_desc()}</Description>
                <SelectTrigger />
                <SelectContent>
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
        )}

        {(data.listTypeNew === "have" || data.listTypeNew === "want") && (
          <Controller
            control={control}
            name="linkedListId"
            render={({
              field: { name, value, onChange, onBlur },
              fieldState: { invalid, error },
            }) => (
              <Select
                aria-label={m.list_create_link_list_label()}
                placeholder={m.common_form_none()}
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
                validationBehavior="aria"
              >
                <Label>{m.list_create_link_list_label()}</Label>
                <Description>{m.list_create_link_list_desc()}</Description>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem id="" textValue={m.common_form_none()}>
                    {m.common_form_none()}
                  </SelectItem>
                  {linkedListOptions.map((list) => (
                    <SelectItem key={list.id} id={`${list.id}`} textValue={list.name}>
                      {list.name}
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
          name="profileAddress"
          rules={{
            required: data.isProfileBind ? m.list_create_profile_required() : false,
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
              isRequired={data.isProfileBind}
              isDisabled={data.isProfileBind}
            >
              <Label>{m.list_create_profile_label()}</Label>
              <Description>
                {data.isProfileBind
                  ? m.list_create_profile_desc()
                  : m.list_create_display_profile_desc()}
              </Description>
              <SelectTrigger />
              <SelectContent>
                {!data.isProfileBind && (
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

        {(data.listTypeNew === "sale" || data.listTypeNew === "have") && (
          <Controller
            control={control}
            name="isProfileBind"
            render={({ field: { name, value, onChange, onBlur } }) => (
              <CheckboxField
                name={name}
                isSelected={value}
                onChange={onChange}
                onBlur={onBlur}
                validationBehavior="aria"
                isDisabled
              >
                <Checkbox>{m.list_create_profile_bind_label()}</Checkbox>
                <Description>{m.list_create_profile_bind_desc()}</Description>
              </CheckboxField>
            )}
          />
        )}

        {(data.listTypeNew === "have" ||
          data.listTypeNew === "sale" ||
          data.listTypeNew === "want") && (
          <Controller
            control={control}
            name="discoverable"
            render={({ field: { name, value, onChange, onBlur } }) => (
              <SwitchField
                name={name}
                isSelected={value}
                onChange={onChange}
                onBlur={onBlur}
                isDisabled={data.listTypeNew !== "want" && !data.isProfileBind}
              >
                <Switch>{m.list_create_discoverable_label()}</Switch>
                <Description>
                  {data.listTypeNew === "want"
                    ? m.list_create_discoverable_want_desc()
                    : data.listTypeNew === "sale"
                      ? m.list_create_discoverable_sale_desc()
                      : m.list_create_discoverable_have_desc()}
                </Description>
              </SwitchField>
            )}
          />
        )}

        {(data.listTypeNew === "sale" || data.listTypeNew === "have") && (
          <Controller
            control={control}
            name="hideSerial"
            render={({ field: { name, value, onChange, onBlur } }) => (
              <CheckboxField
                name={name}
                isSelected={value}
                onChange={onChange}
                onBlur={onBlur}
                validationBehavior="aria"
                isDisabled={!data.isProfileBind}
              >
                <Checkbox>{m.list_create_hide_serial_label()}</Checkbox>
                <Description>{m.list_create_hide_serial_desc()}</Description>
              </CheckboxField>
            )}
          />
        )}

        <Controller
          control={control}
          name="hideUser"
          render={({ field: { name, value, onChange, onBlur } }) => (
            <CheckboxField
              name={name}
              isSelected={value}
              onChange={onChange}
              onBlur={onBlur}
              validationBehavior="aria"
            >
              <Checkbox>{m.list_create_hide_user_label()}</Checkbox>
              <Description>{m.list_create_hide_user_desc({ siteName: SITE_NAME })}</Description>
            </CheckboxField>
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
