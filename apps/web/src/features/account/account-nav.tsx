import {
  ArrowLeftIcon,
  BellIcon,
  CaretRightIcon,
  ChatCircleIcon,
  type Icon,
  KeyIcon,
  LinkIcon,
  LockIcon,
  ProhibitIcon,
  UserIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { type ReactNode, useId } from "react";

import { accountsOptions } from "@/features/account/queries";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const SECTIONS = [
  { to: "/account/general", label: m.auth_account_general, icon: UserIcon },
  { to: "/account/profiles", label: m.account_section_profiles, icon: LinkIcon },
  { to: "/account/notifications", label: m.notification_section, icon: BellIcon },
  { to: "/account/messages", label: m.chat_settings_tab, icon: ChatCircleIcon },
  { to: "/account/blocked", label: m.mod_blocked_tab, icon: ProhibitIcon },
  { to: "/account/sign-in", label: m.account_section_sign_in, icon: KeyIcon },
  { to: "/account/password", label: m.account_section_password, icon: LockIcon },
  { to: "/account/danger", label: m.auth_account_danger_zone, icon: WarningIcon },
] as const satisfies readonly { to: string; label: () => string; icon: Icon }[];

/** The sections this account has: Password only with a password to change. */
function useSections() {
  const accounts = useQuery(accountsOptions);
  const hasPassword = accounts.data?.some((a) => a.providerId === "credential") ?? false;
  return SECTIONS.filter((section) => section.to !== "/account/password" || hasPassword);
}

/** `/account` shows General beside the menu, so General is current there too. */
function useCurrentSection() {
  const pathname = useLocation({ select: (s) => s.pathname.replace(/\/$/, "") });
  return pathname === "/account" ? "/account/general" : pathname;
}

export function AccountMenu({ className }: { className?: string }) {
  const sections = useSections();
  const current = useCurrentSection();

  return (
    <nav aria-label={m.account_sections_label()} className={className}>
      <ul className="flex flex-col gap-0.5">
        {sections.map((section) => (
          <li key={section.to}>
            <Link
              to={section.to}
              aria-current={section.to === current ? "page" : undefined}
              className={cn(
                "text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm",
                "aria-[current=page]:bg-accent aria-[current=page]:text-foreground aria-[current=page]:font-medium",
              )}
            >
              <section.icon className="size-4 shrink-0" />
              {section.label()}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Below `md`, `/account` is this list and each row opens its section. */
export function AccountSectionList({ className }: { className?: string }) {
  const sections = useSections();

  return (
    <nav aria-label={m.account_sections_label()} className={className}>
      <ul className="flex flex-col divide-y rounded-lg border">
        {sections.map((section) => (
          <li key={section.to}>
            <Link
              to={section.to}
              className="hover:bg-accent flex min-h-12 items-center gap-3 px-4 text-sm"
            >
              <section.icon className="text-muted-foreground size-5 shrink-0" />
              <span className="flex-1">{section.label()}</span>
              <CaretRightIcon className="text-muted-foreground size-4" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AccountSection({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <Link
        to="/account"
        className="text-muted-foreground hover:text-foreground -mb-1 inline-flex w-fit items-center gap-1.5 text-sm md:hidden"
      >
        <ArrowLeftIcon className="size-4" />
        {m.account_back()}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div className="flex flex-col gap-0.5">
          <h2 id={headingId} className="text-base font-semibold text-balance">
            {title}
          </h2>
          {description !== undefined && (
            <div className="text-muted-foreground text-sm text-pretty">{description}</div>
          )}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
