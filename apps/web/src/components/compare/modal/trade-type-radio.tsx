"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";

import { Description, Label } from "@/components/ui/field";
import { Radio, RadioGroup } from "@/components/ui/radio";

type TargetType = "profile" | "list";

type TradeType = "missing" | "matches";

const descriptions: Record<TargetType, Record<TradeType, string>> = {
  profile: {
    missing: "Items in your list that they don't have",
    matches: "Items that both appear in your list and their collection",
  },
  list: {
    missing: "Items in your list that don't appear in their list",
    matches: "Items that appear in both lists",
  },
};

type TradeTypeRadioProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  rules?: object;
  targetTypeField?: FieldPath<T>;
};

export function TradeTypeRadio<T extends FieldValues>({
  control,
  name,
  rules,
  targetTypeField = "targetType" as FieldPath<T>,
}: TradeTypeRadioProps<T>) {
  const targetType = useWatch({ control, name: targetTypeField }) as TargetType;

  const currentDescriptions = descriptions[targetType] ?? descriptions.profile;

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { name: fieldName, value, onChange } }) => (
        <RadioGroup name={fieldName} value={value} onChange={onChange} validationBehavior="aria">
          <Radio value="missing">
            <Label>Show missing</Label>
            <Description>{currentDescriptions.missing}</Description>
          </Radio>
          <Radio value="matches">
            <Label>Show matches</Label>
            <Description>{currentDescriptions.matches}</Description>
          </Radio>
        </RadioGroup>
      )}
    />
  );
}
