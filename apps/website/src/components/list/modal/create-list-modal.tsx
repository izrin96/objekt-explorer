import { QueryErrorResetBoundary, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import { Form } from "react-aria-components/Form";
import { ErrorBoundary } from "react-error-boundary";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/intentui/button";
import { Checkbox } from "@/components/intentui/checkbox";
import { Description, FieldError, Label } from "@/components/intentui/field";
import { Input } from "@/components/intentui/input";
import { Loader } from "@/components/intentui/loader";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/intentui/modal";
import { Radio, RadioGroup } from "@/components/intentui/radio";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/intentui/select";
import { TextField } from "@/components/intentui/text-field";
import { Textarea } from "@/components/intentui/textarea";
import ErrorFallbackRender from "@/components/router/error-boundary";
import Portal from "@/components/shared/portal";
import { useUserLists, useUserProfiles } from "@/hooks/use-user";
import { orpc } from "@/lib/orpc/client";
import type { ListTypeNew } from "@/lib/universal/list";
import { parseNickname, SITE_NAME } from "@/lib/utils";
import { m } from "@/paraglide/messages";

type CreateListModalProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function CreateListModal({ open, setOpen }: CreateListModalProps) {
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen} size="lg">
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
  const userLists = useUserLists();
  const { data: currencies } = useSuspenseQuery(orpc.meta.supportedCurrencies.queryOptions());
  const { handleSubmit, control, watch, setValue } = useForm({
    defaultValues: {
      name: "",
      description: "",
      currency: "",
      hideUser: true,
      listTypeNew: "general" as ListTypeNew,
      isProfileBind: false,
      hideSerial: false,
      linkedListId: "",
      profileAddress: "",
    },
  });

  const watchedListTypeNew = watch("listTypeNew") as ListTypeNew;
  const watchedIsProfileBind = watch("isProfileBind");

  // Reset isProfileBind and hideSerial when switching away from sale/have
  useEffect(() => {
    if (watchedListTypeNew !== "sale" && watchedListTypeNew !== "have") {
      setValue("isProfileBind", false);
      setValue("hideSerial", false);
    }
  }, [watchedListTypeNew, setValue]);

  // Filter linked list options based on opposite type
  const linkedListOptions = userLists.filter((l) => {
    if (watchedListTypeNew === "have") return l.listTypeNew === "want";
    if (watchedListTypeNew === "want") return l.listTypeNew === "have";
    return false;
  });

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
      listTypeNew: data.listTypeNew,
      isProfileBind: data.isProfileBind,
      hideSerial: data.hideSerial,
      linkedListId: data.linkedListId ? Number(data.linkedListId) : null,
      profileAddress: data.profileAddress || null,
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

        <Controller
          control={control}
          name="listTypeNew"
          render={({ field: { name, value, onChange } }) => (
            <RadioGroup name={name} value={value} onChange={onChange} validationBehavior="aria">
              <Label>{m.list_create_list_type_label()}</Label>
              <Description>{m.list_create_list_type_desc()}</Description>
              <Radio value="general">
                <Label>{m.list_create_general_list_label()}</Label>
                <Description>{m.list_create_general_list_desc()}</Description>
              </Radio>
              <Radio value="sale">
                <Label>{m.list_create_sale_list_label()}</Label>
                <Description>{m.list_create_sale_list_desc()}</Description>
              </Radio>
              <Radio value="have">
                <Label>{m.list_create_have_list_label()}</Label>
                <Description>{m.list_create_have_list_desc()}</Description>
              </Radio>
              <Radio value="want">
                <Label>{m.list_create_want_list_label()}</Label>
                <Description>{m.list_create_want_list_desc()}</Description>
              </Radio>
            </RadioGroup>
          )}
        />

        {watchedListTypeNew === "sale" && (
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

        {(watchedListTypeNew === "have" || watchedListTypeNew === "want") && (
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
            required: watchedIsProfileBind ? m.list_create_profile_required() : false,
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
              isRequired={watchedIsProfileBind}
            >
              <Label>{m.list_create_profile_label()}</Label>
              <Description>
                {watchedIsProfileBind
                  ? m.list_create_profile_desc()
                  : m.list_create_display_profile_desc()}
              </Description>
              <SelectTrigger />
              <SelectContent>
                {!watchedIsProfileBind && (
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

        {(watchedListTypeNew === "sale" || watchedListTypeNew === "have") && (
          <Controller
            control={control}
            name="isProfileBind"
            render={({ field: { name, value, onChange, onBlur } }) => (
              <Checkbox
                name={name}
                isSelected={value}
                onChange={onChange}
                onBlur={onBlur}
                validationBehavior="aria"
              >
                <Label>{m.list_create_profile_bind_label()}</Label>
                <Description>{m.list_create_profile_bind_desc()}</Description>
              </Checkbox>
            )}
          />
        )}

        {(watchedListTypeNew === "sale" || watchedListTypeNew === "have") &&
          watchedIsProfileBind && (
            <Controller
              control={control}
              name="hideSerial"
              render={({ field: { name, value, onChange, onBlur } }) => (
                <Checkbox
                  name={name}
                  isSelected={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  validationBehavior="aria"
                >
                  <Label>{m.list_create_hide_serial_label()}</Label>
                  <Description>{m.list_create_hide_serial_desc()}</Description>
                </Checkbox>
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
