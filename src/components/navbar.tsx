"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import AppLogo from "./app-logo";
import SelectedArtistFilter from "./filters/filter-selected-artist";
import { ThemeStyleSwitcher } from "./theme-style-select";
import { Container } from "./ui/container";
import { Link } from "./ui/link";
import UserNav from "./user-nav";
import UserSearch from "./user-search";

export default function Navbar() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/activity");
  }, []);

  return (
    <nav className="sticky top-0 right-0 left-0 z-30 h-14 bg-gradient-to-b from-bg/80 to-transparent">
      <div className="-z-1 mask-b-from-40% absolute size-full backdrop-blur-lg"></div>
      <Container className="flex justify-center">
        <div className="flex h-14 grow items-center gap-2">
          <AppLogo />
          <div className="flex items-center">
            <Activity />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Suspense>
            <UserNav />
          </Suspense>
          <ThemeStyleSwitcher />
          <SelectedArtistFilter />
          <UserSearch />
        </div>
      </Container>
    </nav>
  );
}

function Activity() {
  return (
    <Link href="/activity" className="flex items-center gap-2 px-1.5 py-1.5 font-medium text-sm">
      <span className="text-xs">Activity</span>
    </Link>
  );
}
