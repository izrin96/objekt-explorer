"use client";

import { CubeIcon } from "@phosphor-icons/react/dist/ssr";
import { motion } from "motion/react";
import SelectedArtistFilter from "./filters/filter-selected-artist";
import { ThemeStyleSwitcher } from "./theme-style-select";
import { Container, Link } from "./ui";
import UserNav from "./user-nav";
import UserSearch from "./user-search";

export default function Navbar() {
  return (
    <nav className="sticky top-0 right-0 left-0 z-30 h-14 bg-gradient-to-b from-bg/80 to-transparent">
      <div className="-z-1 mask-b-from-40% absolute size-full backdrop-blur-lg"></div>
      <Container className="flex justify-center">
        <div className="flex h-14 grow items-center gap-2">
          <Link href="/">
            <motion.div className="flex items-center gap-2" whileHover="hover">
              <motion.div
                variants={{
                  initial: { rotate: 0 },
                  hover: { rotate: 360 },
                }}
                transition={{ duration: 0.4, ease: [0.39, 0.24, 0.3, 1] }}
              >
                <CubeIcon size={24} weight="fill" />
              </motion.div>
              <span className="hidden select-none truncate font-semibold text-lg sm:block">
                Objekt Tracker
              </span>
            </motion.div>
          </Link>
          <div className="flex items-center">
            <Activity />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserNav />
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
