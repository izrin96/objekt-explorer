import { SelectionPlusIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useArtistScopeNarrowed } from "@/features/artist/cosmo-artist-provider";
import { useCurrentUser } from "@/features/user/hooks";
import { displayNickname, nicknameParam } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { useListTarget } from "./list-provider";
import { useListOwned } from "./use-list-owned";

/**
 * `listEntries` is scoped to the selected artists, so with an artist left out
 * an empty result may be hiding entries rather than meaning there are none.
 */
export function EmptyList() {
  const list = useListTarget();
  const isOwner = useListOwned();
  const { data: user } = useCurrentUser();
  const scopeNarrowed = useArtistScopeNarrowed();

  if (scopeNarrowed) {
    return (
      <EmptyState
        icon={SelectionPlusIcon}
        title={m.common_scope_empty_title()}
        hint={user ? m.list_scope_empty_hint_menu() : m.list_scope_empty_hint_settings()}
      />
    );
  }

  if (!isOwner) {
    return (
      <EmptyState
        icon={SelectionPlusIcon}
        title={m.list_empty_visitor_title()}
        hint={m.list_empty_visitor_hint()}
      />
    );
  }

  // a bound list only takes objekts its profile owns, so point at that collection
  if (list.isProfileBind && list.profileAddress) {
    const profile = displayNickname(list.profileAddress, list.profile?.nickname);
    return (
      <EmptyState
        icon={SelectionPlusIcon}
        title={m.list_empty_title()}
        hint={m.list_empty_bound_hint({ profile })}
        action={
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                to="/@{$nickname}"
                params={{ nickname: nicknameParam(list.profileAddress, list.profile?.nickname) }}
              />
            }
          >
            {m.list_open_profile_collection({ profile })}
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={SelectionPlusIcon}
      title={m.list_empty_title()}
      hint={m.list_empty_hint()}
      action={
        <Button variant="outline" size="sm" render={<Link to="/" />}>
          {m.list_browse_objekts()}
        </Button>
      }
    />
  );
}
