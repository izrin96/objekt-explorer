import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppNav } from "@/components/app-nav";
import { ToastProvider } from "@/components/ui/toast";
import { startOverflowGuard } from "@/lib/dev-overflow-guard";
import { cn, containerClass } from "@/lib/utils";
import { useApplySettings } from "@/store/settings";

/**
 * Dev-only: shouts when anything reaches past the right edge of the viewport
 * or of an open overlay. Rendered behind `import.meta.env.DEV` so the guard is
 * tree-shaken out of the production bundle.
 */
function OverflowGuard() {
  const pathname = useLocation({ select: (s) => s.pathname });

  useEffect(() => startOverflowGuard(() => pathname), [pathname]);

  return null;
}

function RootLayout() {
  // one place mirrors the device settings onto <html>
  useApplySettings();

  return (
    <ToastProvider position="bottom-right">
      {/* the profile banner's full-bleed copy is wider than the content box;
          clip it here so no page can scroll sideways. `clip` rather than
          `hidden`: it creates no scroll container, so the sticky nav still works. */}
      <div className="min-h-svh overflow-x-clip">
        <AppNav />
        {/* the clip above hides page overflow from the document, so the guard
            measures this box instead */}
        <main
          data-overflow-guard
          className={cn(containerClass, "flex flex-col gap-4.5 px-5 pt-5 pb-10")}
        >
          <Outlet />
        </main>
      </div>
      {import.meta.env.DEV && <OverflowGuard />}
    </ToastProvider>
  );
}

export const rootRoute = createRootRoute({ component: RootLayout });
