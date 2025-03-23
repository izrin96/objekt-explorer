"use client"

import {
  NumberField as NumberFieldPrimitive,
  type NumberFieldProps as NumberFieldPrimitiveProps,
  type ValidationResult,
} from "react-aria-components"

import { Description, FieldError, FieldGroup, Input, Label } from "./field"
import { composeTailwindRenderProps } from "./primitive"

interface NumberFieldProps extends NumberFieldPrimitiveProps {
  label?: string
  description?: string
  placeholder?: string
  errorMessage?: string | ((validation: ValidationResult) => string)
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
      className={composeTailwindRenderProps(className, "group flex flex-col gap-y-1.5")}
    >
      {label && <Label>{label}</Label>}
      <FieldGroup className="overflow-hidden">
        {() => (
          <>
            <Input
              className="tabular-nums"
              placeholder={placeholder}
            />
          </>
        )}
      </FieldGroup>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
    </NumberFieldPrimitive>
  )
}

export type { NumberFieldProps }
export { NumberField }
