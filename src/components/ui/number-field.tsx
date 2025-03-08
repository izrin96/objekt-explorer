"use client";

import {
  NumberField as NumberFieldPrimitive,
  type NumberFieldProps as NumberFieldPrimitiveProps,
  type ValidationResult,
} from "react-aria-components";
import { tv } from "tailwind-variants";

import { Description, FieldError, FieldGroup, Input, Label } from "./field";
import { composeTailwindRenderProps } from "./primitive";

const numberFieldStyles = tv({
  slots: {
    base: "group flex flex-col gap-y-1.5",
    stepperButton:
      "h-10 cursor-default pressed:bg-primary px-3 pressed:text-primary-fg text-muted-fg group-disabled:bg-secondary/70 forced-colors:group-disabled:text-[GrayText]",
  },
});

const { base } = numberFieldStyles();

interface NumberFieldProps extends NumberFieldPrimitiveProps {
  label?: string;
  description?: string;
  placeholder?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

const NumberField = ({
  label,
  placeholder,
  description,
  className,
  errorMessage,
  ...props
}: NumberFieldProps) => {
  return (
    <NumberFieldPrimitive
      {...props}
      className={composeTailwindRenderProps(className, base())}
    >
      {label && <Label>{label}</Label>}
      <FieldGroup className="overflow-hidden">
        {() => (
          <>
            <Input
              className="px-13 tabular-nums sm:px-2.5"
              placeholder={placeholder}
            />
          </>
        )}
      </FieldGroup>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
    </NumberFieldPrimitive>
  );
};

export type { NumberFieldProps };
export { NumberField };
