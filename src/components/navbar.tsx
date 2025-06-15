"use client";

import { ThemeSwitcher } from "./theme-switcher";
import { CubeIcon } from "@phosphor-icons/react/dist/ssr";
import { Container, Link } from "./ui";
import UserSearch from "./user-search";
import UserNav from "./user-nav";
import Changelog from "./changelog";
import { motion } from "motion/react";

export default function Navbar() {
  return (
    <nav className="sticky left-0 right-0 top-0 h-14 z-30 from-bg/80 bg-gradient-to-b to-transparent">
      <div className="size-full absolute -z-1 mask-b-from-40% backdrop-blur-lg"></div>
      <Container className="flex justify-center">
        <div className="grow gap-2 flex items-center h-14">
          <Link href="/">
            <motion.div className="flex gap-2 items-center" whileHover="hover">
              <motion.div
                variants={{
                  initial: { rotate: 0 },
                  hover: { rotate: 360 },
                }}
                transition={{ duration: 0.4, ease: [0.39, 0.24, 0.3, 1] }}
              >
                <CubeIcon size={24} weight="fill" />
              </motion.div>
              <span className="font-semibold text-lg select-none truncate hidden sm:block">
                Objekt Tracker
              </span>
            </motion.div>
          </Link>
          <Changelog />
          <Activity />
          <Live />
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <UserNav />
          <UserSearch />
        </div>
      </Container>
    </nav>
  );
}

function Activity() {
  return (
    <Link
      href="/activity"
      className="px-2 py-1.5 flex items-center gap-2 text-sm font-medium"
    >
      {/* <RadioTowerIcon size={18} /> */}
      <span className="hidden sm:block text-xs">Activity</span>
    </Link>
  );
}

function Live() {
  return (
    <Link
      href="/live"
      className="px-2 py-1.5 flex items-center gap-2 text-sm font-medium"
    >
      <span className="hidden sm:block text-xs">Live</span>
    </Link>
  );
}
