import { FileDashedIcon, HouseIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { PageMain } from "@/components/layout/page-main";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

export function NotFoundComponent() {
  return (
    <PageMain>
      <EmptyState
        bordered={false}
        icon={FileDashedIcon}
        title={m.not_found_page()}
        action={
          <Button variant="outline" size="sm" render={<Link to="/" />}>
            <HouseIcon />
            {m.nav_home()}
          </Button>
        }
      />
    </PageMain>
  );
}
