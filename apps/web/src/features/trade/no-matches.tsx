import { CardsThreeIcon } from "@phosphor-icons/react";
import type { PublicList } from "@repo/api/schemas/list";
import { useQuery } from "@tanstack/react-query";
import { Link, type LinkComponentProps } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getListLinkOption } from "@/features/list/list-link";
import { listPreviewsOptions } from "@/features/list/queries";
import { m } from "@/paraglide/messages";

/**
 * For you under Any with no post matching: the way out to Browse, and back to the viewer's own
 * lists. The entry counts are read only here, so a viewer whose lists are empty learns that is why.
 */
export function NoMatches({
  compared,
  counted,
  showAll,
  onAllLists,
}: {
  /** the list Compare with names, if any */
  compared: PublicList | undefined;
  /** the slugs whose entries the matches were taken from */
  counted: string[];
  showAll: LinkComponentProps["search"];
  onAllLists: () => void;
}) {
  const { data: previews } = useQuery(listPreviewsOptions(counted));
  const empty =
    previews !== undefined &&
    counted.length > 0 &&
    counted.every((slug) => (previews.get(slug)?.count ?? 0) === 0);

  return (
    <EmptyState
      icon={CardsThreeIcon}
      title={
        compared
          ? m.trade_browse_no_matches_list_title({ list: compared.name })
          : m.trade_browse_no_matches_title()
      }
      hint={
        empty
          ? compared
            ? m.trade_browse_no_matches_list_empty_hint({ list: compared.name })
            : m.trade_browse_no_matches_empty_hint()
          : m.trade_browse_no_matches_hint()
      }
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {compared ? (
            <>
              <Button variant="outline" size="sm" onClick={onAllLists}>
                {m.trade_list_all()}
              </Button>
              <Button
                variant="outline"
                size="sm"
                render={<Link {...getListLinkOption(compared)} />}
              >
                {m.trade_side_open_list()}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" render={<Link to="/list" />}>
              {m.trade_open_lists()}
            </Button>
          )}
          <Button variant="outline" size="sm" render={<Link to="/trade" search={showAll} />}>
            {m.trade_browse_show_all_posts()}
          </Button>
        </div>
      }
    />
  );
}
