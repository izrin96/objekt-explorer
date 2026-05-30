import { twMerge } from "tailwind-merge";

export interface ContainerProps extends React.ComponentProps<"div"> {
  constrained?: boolean;
}

export function Container({ className, constrained = false, ref, ...props }: ContainerProps) {
  return (
    <div
      className={twMerge(
        // custom change to 2xl
        "mx-auto w-full max-w-(--container-breakpoint) [--container-breakpoint:var(--breakpoint-2xl)] [--container-padding:--spacing(4)]",
        constrained ? "sm:px-(--container-padding)" : "px-(--container-padding)",
        className,
      )}
      {...props}
      ref={ref}
    />
  );
}
