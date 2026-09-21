import { CubeIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type React from "react";

import { SITE_NAME, cn } from "@/lib/utils";

/**
 * `bg-popover`, not `bg-card`: `--card` is transparent in the dark theme, so a
 * `bg-card` auth card would be a bare outline and the divider label below would
 * have nothing to mask the rule with.
 */
export function AuthShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex w-full justify-center pt-6 pb-24 sm:pt-10">
      <div className="flex w-full max-w-sm min-w-0 flex-col gap-5">
        <Link
          to="/"
          className="font-display mx-auto flex items-center gap-2 text-[15px] font-bold tracking-tight whitespace-nowrap"
        >
          <span className="bg-foreground text-background grid size-6 shrink-0 place-items-center rounded-[7px]">
            <CubeIcon weight="bold" className="size-3.5" />
          </span>
          <span>{SITE_NAME}</span>
        </Link>
        <div
          className={cn("bg-popover flex min-w-0 flex-col gap-5 rounded-xl border p-5", className)}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
