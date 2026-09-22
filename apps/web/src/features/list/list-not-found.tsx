import { ArrowLeftIcon, FileDashedIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

export function ListNotFound() {
  return (
    <EmptyState
      icon={FileDashedIcon}
      title={m.not_found_list()}
      action={
        <Button variant="outline" size="sm" render={<Link to="/list" />}>
          <ArrowLeftIcon />
          {m.list_back_to_lists()}
        </Button>
      }
    />
  );
}
