import { CardsThreeIcon, LinkIcon, PlusIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useUserLists, useUserProfiles } from "@/features/user/hooks";
import { joinList } from "@/lib/text";
import { m } from "@/paraglide/messages";

import { matchBlockOf } from "./browse-search";

/**
 * For you for a viewer whose lists can't match yet: why, and the fix. A new want list makes the
 * page a feed at once, since the route reads the viewer's lists on each render, so the route owns
 * the create dialog and it outlives this.
 */
export function CantMatch({ onNewWant }: { onNewWant: () => void }) {
  const lists = useUserLists();
  const profiles = useUserProfiles();
  const block = matchBlockOf(lists, profiles.length > 0);
  if (!block) return null;

  const hint =
    block.kind === "none"
      ? m.trade_cant_match_none()
      : block.kind === "no_profile"
        ? m.trade_cant_match_no_profile({ lists: joinList(block.lists) })
        : m.trade_cant_match_unbound({ lists: joinList(block.lists) });

  return (
    <EmptyState
      icon={CardsThreeIcon}
      title={m.trade_cant_match_title()}
      hint={hint}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={onNewWant}>
            <PlusIcon />
            {m.trade_cant_match_new_want()}
          </Button>
          {block.kind === "no_profile" ? (
            <Button variant="outline" size="sm" render={<Link to="/account/profiles" />}>
              <LinkIcon />
              {m.trade_cant_match_link_profile()}
            </Button>
          ) : block.kind === "unbound" ? (
            <Button variant="outline" size="sm" render={<Link to="/list" />}>
              {m.trade_open_lists()}
            </Button>
          ) : null}
        </div>
      }
    />
  );
}
