"use client";

import { DevicesIcon, MoonIcon, SunIcon, SwatchesIcon } from "@phosphor-icons/react/dist/ssr";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useThemeStyle, type ValidThemeStyle } from "@/hooks/use-theme-style";
import { Button, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator } from "./ui";

interface ThemeStyleItem {
  id: ValidThemeStyle;
  name: string;
}

const themeStyles: ThemeStyleItem[] = [
  {
    id: "default",
    name: "Default",
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
  },
  {
    id: "matsu",
    name: "Matsu",
  },
  {
    id: "bubblegum",
    name: "Bubblegum",
  },
  {
    id: "caffeine",
    name: "Caffeine",
  },
  {
    id: "amethyst-haze",
    name: "Amethyst Haze",
  },
  {
    id: "tangerine",
    name: "Tangerine",
  },
  {
    id: "mocha-mousse",
    name: "Mocha Mousse",
  },
  {
    id: "sunset-horizon",
    name: "Sunset Horizon",
  },
  {
    id: "cosmic-night",
    name: "Cosmic Night",
  },
];

export function ThemeStyleSwitcher() {
  const { theme, setTheme } = useTheme();
  const { themeStyle, setThemeStyle } = useThemeStyle();
  const [mounted, setMounted] = useState(false);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(nextTheme);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Menu>
      <Button intent="outline" size="sq-sm">
        <SwatchesIcon />
      </Button>
      <MenuContent
        selectionMode="multiple"
        selectedKeys={new Set([themeStyle])}
        onAction={(key) => {
          if (key.toString() === "mode") {
            return toggleTheme();
          }
          setThemeStyle(key.toString() as ValidThemeStyle);
        }}
      >
        <MenuItem id="mode">
          {theme === "light" ? <SunIcon /> : theme === "dark" ? <MoonIcon /> : <DevicesIcon />}
          <MenuLabel>
            {theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System"}
          </MenuLabel>
        </MenuItem>

        <MenuSeparator />

        {themeStyles.map((item) => (
          <MenuItem key={item.id} id={item.id} textValue={item.name}>
            <MenuLabel>{item.name}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
