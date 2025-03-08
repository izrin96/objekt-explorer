"use client"

import { IconChevronDown, IconChevronUp, IconMinus, IconPlus } from "justd-icons"
import {
  Button,
  type ButtonProps,
  NumberField as NumberFieldPrimitive,
  type NumberFieldProps as NumberFieldPrimitiveProps,
  type ValidationResult,
} from "react-aria-components"
import { tv } from "tailwind-variants"

import { useMediaQuery } from "@/utils/use-media-query"
import { Description, FieldError, FieldGroup, Input, Label } from "./field"
import { composeTailwindRenderProps } from "./primitive"

const fieldBorderStyles = tv({
  base: "group-data-focused:border-primary/70 forced-colors:border-[Highlight]",
  variants: {
    isInvalid: {
      true: "group-data-focused:border-danger/70 forced-colors:border-[Mark]",
    },
    isDisabled: {
      true: "group-data-focused:border-input/70",
    },
  },
})

const numberFieldStyles = tv({
  slots: {
    base: "group flex flex-col gap-y-1.5",
    stepperButton:
      "h-10 cursor-default pressed:bg-primary px-3 pressed:text-primary-fg text-muted-fg group-disabled:bg-secondary/70 forced-colors:group-disabled:text-[GrayText]",
  },
})

const { base, stepperButton } = numberFieldStyles()

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
  const isMobile = useMediaQuery("(max-width: 768px)")
  return (
    <NumberFieldPrimitive {...props} className={composeTailwindRenderProps(className, base())}>
      {label && <Label>{label}</Label>}
      <FieldGroup className="overflow-hidden">
        {(renderProps) => (
          <>
            {isMobile ? <StepperButton slot="decrement" className="border-r" /> : null}
            <Input className="px-13 tabular-nums sm:px-2.5" placeholder={placeholder} />
            <div
              className={fieldBorderStyles({
                ...renderProps,
                className: "grid h-10 place-content-center border-s",
              })}
            >
              {isMobile ? (
                <StepperButton slot="increment" />
              ) : (
                <div className="flex h-full flex-col">
                  <StepperButton slot="increment" emblemType="chevron" className="h-5 px-1" />
                  <div
                    className={fieldBorderStyles({
                      ...renderProps,
                      className: "border-input border-b",
                    })}
                  />
                  <StepperButton slot="decrement" emblemType="chevron" className="h-5 px-1" />
                </div>
              )}
            </div>
          </>
        )}
      </FieldGroup>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
    </NumberFieldPrimitive>
  )
}

interface StepperButtonProps extends ButtonProps {
  slot: "increment" | "decrement"
  emblemType?: "chevron" | "default"
  className?: string
}

const StepperButton = ({
  slot,
  className,
  emblemType = "default",
  ...props
}: StepperButtonProps) => {
  const icon =
    emblemType === "chevron" ? (
      slot === "increment" ? (
        <IconChevronUp className="size-5" />
      ) : (
        <IconChevronDown className="size-5" />
      )
    ) : slot === "increment" ? (
      <IconPlus />
    ) : (
      <IconMinus />
    )
  return (
    <Button className={stepperButton({ className })} slot={slot} {...props}>
      {icon}
    </Button>
  )
}

export type { NumberFieldProps }
export { NumberField }
