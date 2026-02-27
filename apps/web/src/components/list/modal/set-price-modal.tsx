"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useTranslations } from "next-intl";
import { Form } from "react-aria-components";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Description, FieldError, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { NumberField, NumberInput } from "@/components/ui/number-field";
import { TextField } from "@/components/ui/text-field";
import { useUpdateEntryPrices } from "@/hooks/actions/update-entry-prices";
import { useTarget } from "@/hooks/use-target";

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
  const t = useTranslations("list.manage_objekt");
  const tCommon = useTranslations("common.modal");
  const list = useTarget((a) => a.list)!;
  const updateEntryPrices = useUpdateEntryPrices();

  const { handleSubmit, control, watch, reset } = useForm<FormValues>({
    defaultValues: {
      price: 0,
      isQyop: false,
      note: "",
    },
    values: {
      price: objekt?.listPrice ?? 0,
      isQyop: objekt?.isQyop ?? false,
      note: objekt?.note ?? "",
    },
  });

  const isQyop = watch("isQyop");

  const onSubmit = handleSubmit(({ price, isQyop, note }) => {
    if (!isQyop && (Number.isNaN(price) || price < 0)) return;

    const updates = objekts.map((o) => ({
      entryId: Number(o.id),
      price: isQyop ? null : price,
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
      note: null,
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

  if (!list.currency) return null;

  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{t("set_price_title")}</ModalTitle>
        <ModalDescription>
          {t("set_price_desc")} ({list.currency})
        </ModalDescription>
      </ModalHeader>
      <ModalBody>
        <Form onSubmit={onSubmit}>
          <div className="flex flex-col gap-4">
            <Controller
              control={control}
              name="isQyop"
              render={({ field: { value, onChange } }) => (
                <Checkbox isSelected={value} onChange={onChange}>
                  {t("set_price_qyop")}
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
                >
                  <Label>{t("set_price_label")}</Label>
                  <NumberInput />
                  <Description>{list.currency}</Description>
                  <FieldError>{error?.message}</FieldError>
                </NumberField>
              )}
            />
            <Controller
              control={control}
              name="note"
              render={({ field: { name, value, onChange, onBlur } }) => (
                <TextField name={name} value={value} onChange={onChange} onBlur={onBlur}>
                  <Label>{t("set_price_note")}</Label>
                  <Input placeholder={t("set_price_note_placeholder")} />
                </TextField>
              )}
            />
          </div>
        </Form>
      </ModalBody>
      <ModalFooter id="set-price-form">
        <ModalClose>{tCommon("cancel")}</ModalClose>
        <Button intent="secondary" onPress={handleClearPrice}>
          {t("set_price_clear")}
        </Button>
        <Button isPending={updateEntryPrices.isPending} onPress={() => onSubmit()}>
          {t("set_price_title")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
