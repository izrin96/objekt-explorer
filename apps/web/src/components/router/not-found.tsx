import { FileDashedIcon, HouseIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

export function NotFoundComponent() {
  return (
    <EmptyState
      icon={FileDashedIcon}
      title={m.not_found_page()}
      action={
        <Button variant="outline" size="sm" render={<Link to="/" />}>
          <HouseIcon />
          {m.nav_home()}
        </Button>
      }
    />
  );
}
