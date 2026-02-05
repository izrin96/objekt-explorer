"use client";

import { SunIcon, MoonIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "./ui/button";

export function ThemeSwitcher({ intent = "plain", ...props }: React.ComponentProps<typeof Button>) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(nextTheme);
  };

  if (!mounted) return null;

  return (
    <Button
      intent={intent}
      size="sm"
      className="px-2 [--btn-icon:var(--color-fg)] sm:px-2"
      aria-label="Switch theme"
      onPress={toggleTheme}
      {...props}
    >
      {theme === "light" ? <SunIcon /> : theme === "dark" ? <MoonIcon /> : <ComputerDesktopIcon />}
    </Button>
  );
}
