"use client";

import { ChartLineIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { useLocale, useTranslations } from "next-intl";
import { Suspense } from "react";

import AppLogo from "@/components/app-logo";
import SelectedArtistFilter from "@/components/filters/filter-selected-artist";
import { Link } from "@/components/ui/link";
import UserNav from "@/components/user-nav";
import UserSearch from "@/components/user-search";
import { useMediaQuery } from "@/hooks/use-media-query";

import Changelog from "./changelog";
import { MobileNavigation } from "./mobile-navigation";
import { SettingsButton } from "./settings-button";
import { Container } from "./ui/container";

function Notice() {
  const locale = useLocale();
  return (
    <div className="flex items-center justify-center space-x-1 bg-rose-100 text-center text-xs leading-loose text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
      <WarningCircleIcon className="mx-1.5 inline-flex size-4" />
      {locale === "ko"
        ? "코스모 API 문제로 일부 기록의 시리얼 번호 및 전송 가능 여부가 표시되지 않고 있습니다."
        : "Due to a Cosmo API problem, serial numbers and transferability for some records are not being displayed."}
    </div>
  );
}

export default function Navbar() {
  const t = useTranslations("nav");
  const isMobile = useMediaQuery("(max-width: 1023px)");

  return (
    <>
      <Notice />

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
            <Changelog />
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
