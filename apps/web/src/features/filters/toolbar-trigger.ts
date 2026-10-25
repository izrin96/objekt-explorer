import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A filter toolbar button: outline, small, and outlined in the foreground
 * colour while `data-active` says it holds a non-default value.
 */
export const toolbarTrigger = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "data-active:border-foreground gap-1.5",
);
