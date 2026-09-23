import { LinkIcon } from "@phosphor-icons/react";
import { createRoute } from "@tanstack/react-router";
import { useState } from "react";

import { LinkFlow } from "@/components/link/link-flow";
import { LinkedCard } from "@/components/link/linked-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { rootRoute } from "@/routes/root";
import { useCosmoLinks } from "@/store/link";

/**
 * `/link` — not in the top nav, same as the app. Reached from the avatar menu
 * ("My Cosmo") and from "Link this Cosmo" on an unlinked profile header.
 */
function LinkPage() {
  const links = useCosmoLinks((s) => s.links);
  // held open across the link that the flow itself adds, so the success card shows
  const [showFlow, setShowFlow] = useState(links.length === 0);

  return (
    <>
      <PageHeader
        title="My Cosmo"
        description={
          links.length === 0
            ? "No Cosmo linked yet."
            : `${links.length} Cosmo profile${links.length === 1 ? "" : "s"} linked.`
        }
        aside={
          !showFlow && (
            <Button onClick={() => setShowFlow(true)}>
              <LinkIcon />
              Link Cosmo
            </Button>
          )
        }
      />

      {links.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <LinkedCard key={link.address} link={link} />
          ))}
        </div>
      )}

      {showFlow && <LinkFlow onDone={() => setShowFlow(false)} />}
    </>
  );
}

export const linkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/link",
  component: LinkPage,
});
