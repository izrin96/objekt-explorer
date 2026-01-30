"use client";

import { IconDeviceDesktop2, IconMoon, IconSun } from "@intentui/icons";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "./ui/button";

export function ThemeSwitcher({
  intent = "outline",
  ...props
}: React.ComponentProps<typeof Button>) {
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
      className="bg-bg/50 px-2 sm:px-2"
      aria-label="Switch theme"
      onClick={toggleTheme}
      {...props}
    >
      {theme === "light" ? <IconSun /> : theme === "dark" ? <IconMoon /> : <IconDeviceDesktop2 />}
    </Button>
  );
}
