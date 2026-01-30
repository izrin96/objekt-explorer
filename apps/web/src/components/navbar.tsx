"use client";

import { ChartLineIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import AppLogo from "@/components/app-logo";
import SelectedArtistFilter from "@/components/filters/filter-selected-artist";
import { Link } from "@/components/ui/link";
import UserNav from "@/components/user-nav";
import UserSearch from "@/components/user-search";
import { useMediaQuery } from "@/hooks/use-media-query";

import { MobileNavigation } from "./mobile-navigation";
import { ThemeSwitcher } from "./theme-switcher";
import { Container } from "./ui/container";

export default function NavbarV2() {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 1023px)");

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/activity");
    router.prefetch("/login");
  }, [router]);

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
                  {menu.label}
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
            {/* <ThemeStyleSwitcher /> */}
            <ThemeSwitcher />
            <SelectedArtistFilter />
            <UserSearch />
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
    label: "Activity",
    icon: ChartLineIcon,
  },
];
