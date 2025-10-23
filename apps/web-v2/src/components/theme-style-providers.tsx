import { type PropsWithChildren, useLayoutEffect, useState } from "react";
import { useThemeStyle } from "@/hooks/use-theme-style";

export default function ThemeStyleProvider({ children }: PropsWithChildren) {
  const { themeStyle } = useThemeStyle();
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    if (document.documentElement.getAttribute("data-theme") !== themeStyle) {
      document.documentElement.setAttribute("data-theme", themeStyle);
    }
    setMounted(true);
  }, [themeStyle]);

  if (!mounted) {
    return null;
  }

  return children;
}
