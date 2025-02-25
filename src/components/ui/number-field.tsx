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
      "h-10 cursor-default px-3 text-muted-fg data-pressed:bg-primary data-pressed:text-primary-fg group-data-disabled:bg-secondary/70 forced-colors:group-data-disabled:text-[GrayText]",
  },
});

const { base } = numberFieldStyles();

interface NumberFieldProps extends NumberFieldPrimitiveProps {
  label?: string;
  description?: string;
  placeholder?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  hideStepper?: boolean;
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
            <Input className="tabular-nums" placeholder={placeholder} />
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
