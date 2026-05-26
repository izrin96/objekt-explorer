import { cn } from "@/lib/utils";

export function Badge({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-4xl border border-transparent px-2 py-0.5 text-xs/4 font-medium whitespace-nowrap transition-colors [&>svg]:size-3",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
