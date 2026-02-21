"use client";

import { ChartLineIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { Suspense } from "react";

import AppLogo from "@/components/app-logo";
import SelectedArtistFilter from "@/components/filters/filter-selected-artist";
import { Link } from "@/components/ui/link";
import UserNav from "@/components/user-nav";
import UserSearch from "@/components/user-search";
import { useMediaQuery } from "@/hooks/use-media-query";

import { MobileNavigation } from "./mobile-navigation";
import { SettingsButton } from "./settings-button";
import { Container } from "./ui/container";

export default function Navbar() {
  const t = useTranslations("nav");
  const isMobile = useMediaQuery("(max-width: 1023px)");

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="from-bg/80 sticky top-0 z-40 hidden h-12 bg-linear-to-b to-transparent lg:flex">
        <div className="absolute -z-1 size-full mask-b-from-40% backdrop-blur-lg"></div>

        <Container className="flex items-center [--container-breakpoint:var(--breakpoint-2xl)]">
          <div className="flex items-center gap-x-2">
            <AppLogo />
            <div className="flex items-center gap-x-1">
              {navMenuItems.map((menu) => (
                <NavLink key={menu.href} href={menu.href}>
                  {t(menu.translationKey)}
                  {menu.icon && <menu.icon className="size-4" weight="regular" />}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex-1" aria-hidden />

          <div className="flex items-center gap-x-1">
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

      {/* Mobile Navbar */}
      {isMobile && <MobileNavigation />}
    </>
  );
}

function NavLink({ ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className="text-fg hover:text-fg flex items-center gap-x-2 rounded-full px-2.5 py-1 text-sm font-medium tracking-tight outline-hidden transition duration-200 focus-visible:ring-2"
      {...props}
    />
  );
}

export const navMenuItems = [
  {
    href: "/activity",
    translationKey: "activity" as const,
    icon: ChartLineIcon,
  },
];
