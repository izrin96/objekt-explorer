"use client"

import { IconDeviceDesktop2, IconMoon, IconSun } from "justd-icons"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Button } from "./ui"

export function ThemeSwitcher({
  shape = "square",
  intent = "outline",
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
    setTheme(nextTheme)
  }

  if (!mounted) return null

  return (
    <Button
      shape={shape}
      intent={intent}
      size="square-petite"
      aria-label="Switch theme"
      onPress={toggleTheme}
      {...props}
    >
      {theme === "light" ? <IconSun /> : theme === "dark" ? <IconMoon /> : <IconDeviceDesktop2 />}
    </Button>
  )
}