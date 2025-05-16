"use client"

import { DropZone as DropZonePrimitive } from "react-aria-components"
import { composeTailwindRenderProps } from "./primitive"

export const DropZone = ({ children, className, ...props }: React.ComponentProps<typeof DropZonePrimitive>) => {
  return (
    <DropZonePrimitive
      className={composeTailwindRenderProps(
        className,
        "relative flex min-h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-fg/50 bg-secondary/20 p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 data-[drop-target]:border-primary data-[drop-target]:bg-primary/10"
      )}
      {...props}
    >
      {children}
    </DropZonePrimitive>
  )
}
