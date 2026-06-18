import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useEffect } from "react";
import { Form } from "react-aria-components/Form";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/intentui/button";
import { Checkbox, CheckboxField } from "@/components/intentui/checkbox";
import { Description, FieldError, Label } from "@/components/intentui/field";
import { Input } from "@/components/intentui/input";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/intentui/modal";
import { NumberField, NumberInput } from "@/components/intentui/number-field";
import { TextField } from "@/components/intentui/text-field";
import { useUpdateEntryPrices } from "@/hooks/actions/update-entry-prices";
import { useListTarget } from "@/hooks/use-list-target";
import { m } from "@/paraglide/messages";

type SetPriceModalProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
  objekts: ValidObjekt[];
};

type FormValues = {
  price: number;
  isQyop: boolean;
  note: string;
};

export function SetPriceModal({ open, setOpen, objekts }: SetPriceModalProps) {
  const [objekt] = objekts;
  const list = useListTarget()!;
  const updateEntryPrices = useUpdateEntryPrices();

  const { handleSubmit, control, watch, reset } = useForm<FormValues>({
    values: {
      price: objekt?.price ?? 0,
      isQyop: objekt?.isQyop ?? false,
      note: objekt?.note ?? "",
    },
  });

  const isQyop = watch("isQyop");

  const onSubmit = handleSubmit(({ price, isQyop, note }) => {
    if (!isQyop && (Number.isNaN(price) || price < 0)) return;

    const updates = objekts.map((o) => ({
      entryId: Number(o.id),
      price: isQyop ? null : price || null,
      isQyop,
      note: note || null,
    }));

    updateEntryPrices.mutate(
      { slug: list.slug, updates },
      {
        onSuccess: () => {
          reset();
          setOpen(false);
        },
      },
    );
  });

  const handleClearPrice = () => {
    const updates = objekts.map((o) => ({
      entryId: Number(o.id),
      price: null,
      isQyop: false,
    }));

    updateEntryPrices.mutate(
      { slug: list.slug, updates },
      {
        onSuccess: () => {
          reset();
          setOpen(false);
        },
      },
    );
  };

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open]);

  if (!list.currency) return null;

  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{m.list_manage_objekt_set_price_title()}</ModalTitle>
        <ModalDescription>
          {m.list_manage_objekt_set_price_desc()} ({list.currency})
        </ModalDescription>
      </ModalHeader>
      <ModalBody>
        <Form onSubmit={onSubmit} validationBehavior="aria">
          <div className="flex flex-col gap-4">
            <Controller
              control={control}
              name="isQyop"
              render={({ field: { value, onChange } }) => (
                <CheckboxField isSelected={value} onChange={onChange} validationBehavior="aria">
                  <Checkbox>{m.list_manage_objekt_set_price_qyop()}</Checkbox>
                </CheckboxField>
              )}
            />
            <Controller
              control={control}
              name="price"
              rules={{
                required: !isQyop,
              }}
              disabled={isQyop}
              render={({
                field: { name, value, onChange, onBlur },
                fieldState: { invalid, error },
              }) => (
                <NumberField
                  name={name}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  isInvalid={invalid}
                  minValue={0}
                  isDisabled={isQyop}
                  validationBehavior="aria"
                >
                  <Label>{m.list_manage_objekt_set_price_label()}</Label>
                  <NumberInput />
                  <Description>
                    {list.currency} ({m.list_manage_objekt_set_price_clear_hint()})
                  </Description>
                  <FieldError>{error?.message}</FieldError>
                </NumberField>
              )}
            />
            <Controller
              control={control}
              name="note"
              render={({ field: { name, value, onChange, onBlur } }) => (
                <TextField
                  name={name}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  validationBehavior="aria"
                >
                  <Label>{m.list_manage_objekt_set_price_note()}</Label>
                  <Input placeholder={m.list_manage_objekt_set_price_note_placeholder()} />
                </TextField>
              )}
            />
          </div>
        </Form>
      </ModalBody>
      <ModalFooter id="set-price-form">
        <ModalClose>{m.common_modal_cancel()}</ModalClose>
        <Button className="hidden" intent="secondary" onPress={handleClearPrice}>
          {m.list_manage_objekt_set_price_clear()}
        </Button>
        <Button isPending={updateEntryPrices.isPending} onPress={() => onSubmit()}>
          {m.list_manage_objekt_set_price_title()}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
