import { ArrowLeftIcon, FileDashedIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

export function ListNotFound() {
  // `/list` is the signed-in user's own lists; a visitor would only be bounced to sign in
  const { data: user } = useCurrentUser();

  return (
    <EmptyState
      icon={FileDashedIcon}
      title={m.not_found_list()}
      action={
        user ? (
          <Button variant="outline" size="sm" render={<Link to="/list" />}>
            <ArrowLeftIcon />
            {m.list_back_to_lists()}
          </Button>
        ) : undefined
      }
    />
  );
}
