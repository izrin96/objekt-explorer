import {
  PaperPlaneTiltIcon,
  CubeIcon,
  ListIcon,
  XIcon,
  PulseIcon,
  NoteIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  linkOptions,
  useLocation,
  useMatchRoute,
  Link as RouterLink,
  type LinkProps as RouterLinkProps,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { MenuItemProps } from "react-aria-components/Menu";
import {
  Header,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
} from "react-aria-components/Menu";
import { twMerge } from "tailwind-merge";

import SelectedArtistFilter from "@/components/filters/filter-selected-artist";
import { Button } from "@/components/intentui/button";
import { ButtonGroup } from "@/components/intentui/button-group";
import { Container } from "@/components/intentui/container";
import { Link } from "@/components/intentui/link";
import { MenuLabel } from "@/components/intentui/menu";
import { Modal } from "@/components/intentui/modal";
import { Popover as UiPopover } from "@/components/intentui/popover";
import AppLogo from "@/components/layout/app-logo";
import { ChangelogContent } from "@/components/layout/changelog";
import { StatusPopoverContent, useStatusClasses } from "@/components/layout/status-popover";
import { LoginButton, UserMenu } from "@/components/layout/user-nav";
import UserSearch from "@/components/layout/user-search";
import { useCurrentUser } from "@/hooks/use-user";
import { cx } from "@/lib/primitive";
import { m } from "@/paraglide/messages";

import { SettingsButton } from "./settings-button";

export function useNavMenuItems() {
  return linkOptions([
    {
      to: "/activity",
      label: m.nav_activity(),
      icon: PaperPlaneTiltIcon,
    },
  ]);
}

export default function Navbar() {
  const navMenuItems = useNavMenuItems();
  const { data: user } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useLocation({ select: (s) => s.pathname });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="border-border/40 dark:bg-bg/70 sticky top-0 z-40 flex h-12 items-center border-b bg-white/70 backdrop-blur-2xl">
        <Container className="flex items-center">
          {/* Left: hamburger (mobile) + logo + nav links */}
          <div className="flex items-center gap-x-1.5 sm:gap-x-3">
            {/* Mobile hamburger */}
            <div className="md:hidden">
              <MenuTrigger>
                <MobileMenuTrigger open={mobileOpen} setOpen={setMobileOpen} />
                <MobileMenu open={mobileOpen} setOpen={setMobileOpen} />
              </MenuTrigger>
            </div>
            <AppLogo />
            <SystemStatusGroup />
            {/* Desktop nav links */}
            <div className="hidden items-center gap-x-0.5 md:flex">
              {navMenuItems.map((menu) => (
                <NavLink key={menu.to} to={menu.to}>
                  {menu.icon && <menu.icon className="size-4" weight="regular" />}
                  {menu.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex-1" aria-hidden />

          {/* Right: user actions */}
          <div className="flex items-center gap-x-0.5 md:gap-x-1">
            {!user && <LoginButton />}
            <UserSearch />
            {!user && <SettingsButton />}
            <SelectedArtistFilter />
            {user && <UserMenu user={user.user} />}
          </div>
        </Container>
      </nav>
    </>
  );
}

function SystemStatusGroup() {
  const statusClasses = useStatusClasses();

  return (
    <ButtonGroup>
      <UiPopover>
        <Button size="sq-xs" intent="plain" aria-label="System status" className={statusClasses}>
          <PulseIcon weight="regular" />
        </Button>
        <StatusPopoverContent />
      </UiPopover>
      <Modal>
        <Button
          size="sq-xs"
          intent="outline"
          aria-label={m.common_changelog()}
          // className="border-blue-500/30 bg-blue-100 text-blue-600 [--btn-icon:currentColor] [--btn-overlay:theme(colors.blue.100)] dark:border-blue-500/30 dark:bg-blue-950 dark:text-blue-400 dark:[--btn-overlay:theme(colors.blue.950)]"
        >
          <NoteIcon weight="regular" />
        </Button>
        <ChangelogContent />
      </Modal>
    </ButtonGroup>
  );
}

function NavLink({ to, ...props }: React.ComponentProps<typeof Link>) {
  const pathname = useLocation({ select: (s) => s.pathname });
  const isActive = to ? pathname === to : false;

  return (
    <Link
      to={to}
      className={twMerge(
        "relative flex h-8 items-center gap-x-1.5 rounded-lg px-3 text-sm font-medium outline-hidden transition-colors duration-200 focus-visible:ring-2",
        isActive ? "bg-secondary text-secondary-fg" : "text-muted-fg hover:text-fg",
      )}
      {...props}
    />
  );
}

function MobileMenuTrigger({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <Button
      size="sq-sm"
      onPress={() => setOpen((p) => !p)}
      intent="plain"
      className="pressed:bg-transparent outline-hidden"
      aria-expanded={open}
    >
      <div className="t-icon-swap" data-state={open ? "b" : "a"}>
        <span className="t-icon" data-icon="a">
          <ListIcon size={20} />
        </span>
        <span className="t-icon" data-icon="b">
          <XIcon size={20} />
        </span>
      </div>
      <span className="sr-only">{m.nav_toggle_menu()}</span>
    </Button>
  );
}

function MobileMenu({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const navMenuItems = useNavMenuItems();

  return (
    <Popover
      placement="bottom"
      offset={10}
      onOpenChange={setOpen}
      isOpen={open}
      className={cx(
        "md:hidden",
        "min-h-screen placement-bottom:entering:slide-in-from-top-1 -mt-1.5 w-full overflow-y-auto bg-bg px-2 outline-hidden entering:ease-out [--gap:--spacing(6)]",
        "entering:fade-in exiting:fade-out entering:animate-in exiting:animate-out",
        "slide-out-to-top-1 slide-in-from-top-1",
      )}
      containerPadding={0}
    >
      <Menu className="-mt-2 outline-hidden">
        <MenuSection>
          <MobileNavHeading>{m.nav_navigation()}</MobileNavHeading>
          <MobileNavLink to="/">
            <CubeIcon className="size-5" weight="fill" />
            <MenuLabel>{m.nav_home()}</MenuLabel>
          </MobileNavLink>
          {navMenuItems.map((menu) => (
            <MobileNavLink key={menu.to} to={menu.to}>
              {menu.icon && <menu.icon className="size-5" weight="regular" />}
              <MenuLabel>{menu.label}</MenuLabel>
            </MobileNavLink>
          ))}
        </MenuSection>
      </Menu>
    </Popover>
  );
}

type RouterLinkOptions = Pick<
  RouterLinkProps,
  "to" | "params" | "search" | "hash" | "resetScroll" | "replace" | "preload" | "preloadDelay"
>;

interface MenuItemLinkProps extends Omit<MenuItemProps, "href">, RouterLinkOptions {}

const MenuItemLink = ({ ...props }: MenuItemLinkProps) => {
  const {
    to,
    params,
    search,
    hash,
    resetScroll,
    replace,
    preload,
    preloadDelay,
    ...menuItemProps
  } = props;

  return (
    <MenuItem
      {...menuItemProps}
      href="#"
      render={(domProps) => {
        // React Aria's render prop type is a union of <a> and <div> props.
        // When href is present, it's the <a> variant — spread all props except
        // href (which would override RouterLink's `to`-based navigation).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { href: _href, ...linkProps } = domProps as any;
        return (
          <RouterLink
            {...linkProps}
            to={to}
            params={params}
            search={search}
            hash={hash}
            resetScroll={resetScroll}
            replace={replace}
            preload={preload}
            preloadDelay={preloadDelay}
          />
        );
      }}
    />
  );
};

interface MobileNavLinkProps extends MenuItemLinkProps {}

function MobileNavLink(props: MobileNavLinkProps) {
  const matchRoute = useMatchRoute();
  const isActive = matchRoute({ to: props.to });

  return (
    <MenuItemLink
      {...props}
      className={twMerge(
        "mb-0.5 flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-xl/6 font-medium",
        "focus:outline-hidden",
        "hover:bg-fg/10 hover:text-secondary-fg",
        "focus:bg-fg/10 focus:text-secondary-fg",
        "pressed:bg-fg/10 pressed:text-secondary-fg",
        isActive && [
          "bg-secondary text-secondary-fg",
          "hover:bg-secondary hover:text-secondary-fg",
          "dark:bg-secondary dark:text-secondary-fg dark:hover:bg-secondary dark:hover:text-secondary-fg",
        ],
      )}
    />
  );
}

function MobileNavHeading({ children }: { children: React.ReactNode }) {
  return <Header className="text-muted-fg mt-6 mb-2 px-2 text-sm/6 font-medium">{children}</Header>;
}
