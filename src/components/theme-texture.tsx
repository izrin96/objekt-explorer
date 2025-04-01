"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeTexture() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return theme === "matsu" && <div className="texture"></div>;
}
