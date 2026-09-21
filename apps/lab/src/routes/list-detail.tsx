import { ArrowLeftIcon } from "@phosphor-icons/react";
import { createRoute, Link } from "@tanstack/react-router";

import { compareSearchSchema } from "@/components/compare/compare-filters";
import { ListHeader } from "@/components/list/list-header";
import { ListView } from "@/components/list/list-view";
import { Button } from "@/components/ui/button";
import { rootRoute } from "@/routes/root";
import { useLists } from "@/store/lists";

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <h1 className="font-display text-[22px] font-semibold tracking-tight">List not found</h1>
      <p className="text-muted-foreground text-sm">
        No list is stored at <span className="font-mono">/list/{slug}</span>.
      </p>
      <Button variant="outline" size="sm" render={<Link to="/list" />}>
        <ArrowLeftIcon />
        Back to my lists
      </Button>
    </div>
  );
}

function ListDetail() {
  const { slug } = listRoute.useParams();
  // the lab has no loader: the store is the source, so a missing id is a 404
  const list = useLists((s) => s.lists.find((l) => l.id === slug));

  if (!list) return <NotFound slug={slug} />;

  return (
    <>
      <ListHeader list={list} />
      {/* remounted per list so the drawer and selection never leak across slugs */}
      <ListView key={list.id} list={list} />
    </>
  );
}

/**
 * The app has two addresses for one list — `/list/<slug>` and the owner-scoped
 * `/@nickname/list/<slug>` — and redirects the first to the second when the
 * list is bound to a Cosmo profile. The lab keeps one route; `ListHeader`
 * carries the profile binding as a line of text instead.
 */
export const listRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/list/$slug",
  // Compare lives on the URL, so it survives a reload and a share, and is gone
  // the moment another list is opened — the params are this route's search
  validateSearch: compareSearchSchema,
  component: ListDetail,
});
