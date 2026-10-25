import { CubeIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type React from "react";

import { MessageMarkup } from "@/components/shared/message-markup";
import { SITE_NAME, cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export const authLinkClass = "text-foreground font-medium underline-offset-4 hover:underline";

export function AuthShell({
  children,
  footer,
  className,
}: {
  children: React.ReactNode;
  /** a line under the card, outside it */
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex w-full justify-center pt-6 pb-24 sm:pt-10">
      <div className="flex w-full max-w-sm min-w-0 flex-col gap-5">
        <Link
          to="/"
          className="font-display mx-auto flex items-center gap-2 text-base font-bold tracking-tight whitespace-nowrap"
        >
          <span className="bg-foreground text-background grid size-6 shrink-0 place-items-center rounded-[7px]">
            <CubeIcon weight="bold" className="size-3.5" />
          </span>
          <span>{SITE_NAME}</span>
        </Link>
        <div className={cn("bg-card flex min-w-0 flex-col gap-5 rounded-xl border p-5", className)}>
          {children}
        </div>
        {footer ? (
          <div className="text-muted-foreground px-5 text-center text-xs text-pretty">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function AuthHeader({
  title,
  description,
}: {
  title: string;
  description?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-xl font-semibold text-balance">{title}</h1>
      {description !== undefined && (
        <p className="text-muted-foreground text-sm text-pretty">{description}</p>
      )}
    </div>
  );
}

/** the label masks the rule with the surface behind it, which inside the card is `bg-card` */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center justify-center text-xs">
      <div className="absolute inset-0 flex items-center">
        <div className="bg-border h-px w-full shrink-0" />
      </div>
      <span className="bg-card text-muted-foreground relative px-3">{label}</span>
    </div>
  );
}

/** Discord and X sign-ins create an account too, so sign-in shows this as well as sign-up. */
export function TermsNote() {
  return (
    <MessageMarkup
      parts={m.auth_sign_up_terms.parts()}
      markup={{
        link: (children) => (
          <Link to="/terms-privacy" className="underline underline-offset-2">
            {children}
          </Link>
        ),
      }}
    />
  );
}
