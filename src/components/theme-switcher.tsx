"use client";

import { IconColorPalette, IconDeviceDesktop2, IconMoon, IconSun } from "@intentui/icons";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "./ui";

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
    const nextTheme =
      theme === "light"
        ? "dark"
        : theme === "dark"
          ? "matsu"
          : theme === "matsu"
            ? "system"
            : "light";
    setTheme(nextTheme);
  };

  if (!mounted) return null;

  return (
    <Button intent={intent} size="sq-sm" aria-label="Switch theme" onPress={toggleTheme} {...props}>
      {theme === "light" ? (
        <IconSun />
      ) : theme === "dark" ? (
        <IconMoon />
      ) : theme === "matsu" ? (
        <IconColorPalette />
      ) : (
        <IconDeviceDesktop2 />
      )}
    </Button>
  );
}
