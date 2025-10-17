"use client";

import { CubeIcon } from "@phosphor-icons/react/dist/ssr";
import { motion } from "motion/react";
import { Link } from "./ui/link";

export default function AppLogo() {
  return (
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
  );
}
