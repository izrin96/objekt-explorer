import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useEffect } from "react";
import { Form } from "react-aria-components/Form";
import { Controller, useForm } from "react-hook-form";
import { useIntlayer } from "react-intlayer";

import { Button } from "@/components/intentui/button";
import { Checkbox } from "@/components/intentui/checkbox";
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
  const content = useIntlayer("list");
  const contentCommon = useIntlayer("common");
  const list = useListTarget();
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
        <ModalTitle>{content.manage_objekt.set_price_title.value}</ModalTitle>
        <ModalDescription>
          {content.manage_objekt.set_price_desc.value} ({list.currency})
        </ModalDescription>
      </ModalHeader>
      <ModalBody>
        <Form onSubmit={onSubmit} validationBehavior="aria">
          <div className="flex flex-col gap-4">
            <Controller
              control={control}
              name="isQyop"
              render={({ field: { value, onChange } }) => (
                <Checkbox isSelected={value} onChange={onChange} validationBehavior="aria">
                  {content.manage_objekt.set_price_qyop.value}
                </Checkbox>
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
                  <Label>{content.manage_objekt.set_price_label.value}</Label>
                  <NumberInput />
                  <Description>
                    {list.currency} ({content.manage_objekt.set_price_clear_hint.value})
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
                  <Label>{content.manage_objekt.set_price_note.value}</Label>
                  <Input placeholder={content.manage_objekt.set_price_note_placeholder.value} />
                </TextField>
              )}
            />
          </div>
        </Form>
      </ModalBody>
      <ModalFooter id="set-price-form">
        <ModalClose>{contentCommon.modal.cancel.value}</ModalClose>
        <Button className="hidden" intent="secondary" onPress={handleClearPrice}>
          {content.manage_objekt.set_price_clear.value}
        </Button>
        <Button isPending={updateEntryPrices.isPending} onPress={() => onSubmit()}>
          {content.manage_objekt.set_price_title.value}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
