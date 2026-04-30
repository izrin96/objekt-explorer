import { CubeIcon } from "@phosphor-icons/react/dist/ssr";
import { createLink, useLocation, useMatchRoute, Link as RouterLink } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import type { MenuItemProps } from "react-aria-components/Menu";
import {
  Header,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
} from "react-aria-components/Menu";
import { useIntlayer } from "react-intlayer";
import { twJoin, twMerge } from "tailwind-merge";

import AppLogo from "@/components/app-logo";
import SelectedArtistFilter from "@/components/filters/filter-selected-artist";
import { Button } from "@/components/intentui/button";
import { Separator } from "@/components/intentui/separator";
import UserNav from "@/components/user-nav";
import UserSearch from "@/components/user-search";
import { cx } from "@/lib/primitive";

import Changelog from "./changelog";
import { Container } from "./intentui/container";
import { MenuLabel } from "./intentui/menu";
import { useNavMenuItems } from "./navbar";
import { SettingsButton } from "./settings-button";

export function MobileNavigation() {
  const content = useIntlayer("nav");
  const navMenuItems = useNavMenuItems();
  const [open, setOpen] = useState(false);
  const pathname = useLocation({ select: (s) => s.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <nav className="bg-bg sticky top-0 z-40 flex h-12 items-center lg:hidden">
      <Container className="flex items-center [--container-breakpoint:var(--breakpoint-2xl)]">
        <div className="flex items-center gap-x-1.5">
          <MenuTrigger>
            <Button
              size="sq-sm"
              onPress={() => setOpen((p) => !p)}
              intent="plain"
              className="pressed:bg-transparent outline-hidden"
            >
              <span className="relative flex h-8 w-(--width) items-center justify-center [--width:--spacing(4)]">
                <span className="relative size-(--width)">
                  <span
                    className={twJoin(
                      "bg-fg absolute left-0 block h-0.5 w-(--width) transition-all duration-100",
                      open ? "top-[0.4rem] -rotate-45" : "top-1",
                    )}
                  />
                  <span
                    className={twJoin(
                      "bg-fg absolute left-0 block h-0.5 w-(--width) transition-all duration-100",
                      open ? "top-[0.4rem] rotate-45" : "top-[--spacing(2.6)]",
                    )}
                  />
                </span>
                <span className="sr-only">{content.toggle_menu.value}</span>
              </span>
            </Button>
            <Popover
              placement="bottom"
              offset={10}
              onOpenChange={setOpen}
              isOpen={open}
              className={cx(
                "min-h-screen placement-bottom:entering:slide-in-from-top-1 -mt-1.5 w-full overflow-y-auto bg-bg px-2 outline-hidden entering:ease-out [--gap:--spacing(6)]",
                "entering:fade-in exiting:fade-out entering:animate-in exiting:animate-out",
                "slide-out-to-top-1 slide-in-from-top-1",
                pathname === "/" ? "from-blue-50 dark:from-[#151518]" : "",
              )}
              containerPadding={0}
            >
              <Menu className="-mt-2 outline-hidden">
                <MenuSection>
                  <NavHeading>{content.navigation.value}</NavHeading>
                  <NavLink href="/">
                    <CubeIcon className="size-5" weight="fill" />
                    <MenuLabel>{content.home.value}</MenuLabel>
                  </NavLink>
                  {navMenuItems.map((menu) => (
                    <NavLink key={menu.to} to={menu.to}>
                      {menu.icon && <menu.icon className="size-5" weight="regular" />}
                      <MenuLabel>{menu.label}</MenuLabel>
                    </NavLink>
                  ))}
                </MenuSection>
              </Menu>
            </Popover>
          </MenuTrigger>
          <Separator orientation="vertical" className="mr-1 h-4" />
          <AppLogo />
          <Changelog />
        </div>

        <div className="flex-1" aria-hidden />

        <div className="flex items-center gap-x-1.5">
          <Suspense>
            <UserNav />
          </Suspense>
          <SettingsButton />
          <Suspense>
            <SelectedArtistFilter />
          </Suspense>
          <Suspense>
            <UserSearch />
          </Suspense>
        </div>
      </Container>
    </nav>
  );
}

const MenuItemLinkWrapper = ({ ...props }: MenuItemProps) => {
  return <MenuItem {...props} render={(domProps) => <RouterLink {...(domProps as any)} />} />;
};
const MenuItemLink = createLink(MenuItemLinkWrapper);

interface NavLinkProps extends React.ComponentProps<typeof MenuItemLink> {}

function NavLink(props: NavLinkProps) {
  const matchRoute = useMatchRoute();
  const isActive = matchRoute({
    to: props.to,
  });

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
          "font-medium",
          "text-primary hover:bg-primary/10 hover:text-primary",
          "dark:text-primary dark:hover:bg-primary/10 dark:hover:text-primary",
        ],
      )}
    />
  );
}

function NavHeading({ children }: { children: React.ReactNode }) {
  return <Header className="text-muted-fg mt-6 mb-2 px-2 text-sm/6 font-medium">{children}</Header>;
}
