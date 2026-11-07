import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { GridObjekt } from "@repo/lib/types/objekt";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";

import { CountBar, TotalCount } from "@/components/shared/count-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useScopedFacets } from "@/features/filters/facets";
import { FilterBar } from "@/features/filters/filter-bar";
import { MemberChips } from "@/features/filters/member-chips";
import { filterSearchSchema, pickFilters } from "@/features/filters/search-schema";
import { useResetFilters } from "@/features/filters/use-filters";
import { AddToListProvider } from "@/features/list/add-to-list-dialog";
import { AddToListAction, AddToListMenuItem } from "@/features/list/add-to-list-menu-item";
import { collectionsUrl } from "@/features/objekt/collections-url";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { objektSearchSchema } from "@/features/objekt/drawer/search-schema";
import { useObjektLink } from "@/features/objekt/drawer/use-objekt-link";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { ObjektCardMenu } from "@/features/objekt/objekt-card-menu";
import { ObjektVirtualGrid } from "@/features/objekt/objekt-virtual-grid";
import { toGridCollections } from "@/features/objekt/queries";
import { SelectBar, SelectModeButton } from "@/features/objekt/select-bar";
import { SkeletonGrid } from "@/features/objekt/skeleton-grid";
import { useCollectionObjekts } from "@/features/objekt/use-collection-objekts";
import { useCurrentUser } from "@/features/user/hooks";
import { client, orpc } from "@/lib/orpc";
import { GRID_COLUMNS_MOBILE } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useClearSelectionOnNavigate, useSelection } from "@/stores/selection";

export const Route = createFileRoute("/(container)/")({
  // the homepage lists collections, which carry no token to link
  validateSearch: filterSearchSchema.extend(objektSearchSchema.omit({ id: true }).shape),
  loaderDeps: ({ search }) => ({ filtered: Object.keys(pickFilters(search)).length > 0 }),
  // the first cards come with the document, so the grid paints them before its whole list is in;
  // only the first document needs them, so a client navigation skips the request
  loader: async ({ deps, context: { queryClient } }) => {
    if (!import.meta.env.SSR || deps.filtered) return { lead: [] };
    // awaited, not read from the cache: loaders run in parallel, and the root's read of the same
    // query waits behind error tracking, so the cache is still empty here
    const artist = await queryClient
      .query({ ...orpc.config.getSelectedArtists.queryOptions(), staleTime: "static" })
      .catch(() => []);
    // a head start, so a failed read costs it and never the page
    const { collections } = await client.collections
      .lead({ artist })
      .catch(() => ({ collections: [] }));
    return { lead: collections };
  },
  // the grid's list starts downloading with the document rather than after hydration; the root
  // loader has already read the artist scope the query will ask with. The first row's images
  // start with it too, as the page's largest paint
  head: ({ match, loaderData }) => {
    const artist = match.context.queryClient.getQueryData(
      orpc.config.getSelectedArtists.queryKey(),
    );
    return {
      links: [
        ...(artist
          ? [
              {
                rel: "preload",
                as: "fetch",
                href: collectionsUrl({ artist }),
                crossOrigin: "anonymous" as const,
              },
            ]
          : []),
        ...(loaderData?.lead ?? []).slice(0, GRID_COLUMNS_MOBILE).map((collection) => ({
          rel: "preload",
          as: "image",
          href: collection.thumbnailImage,
          fetchPriority: "high" as const,
        })),
      ],
    };
  },
  component: HomePage,
});

function HomePage() {
  const { data: user } = useCurrentUser();
  const { facets, groups } = useScopedFacets();
  const { objekts, filtered, filters, rarityMap, isPending } = useCollectionObjekts();
  const lead = toGridCollections(Route.useLoaderData({ select: (data) => data.lead }));
  const reset = useResetFilters();
  const ids = useSelection((s) => s.ids);
  const toggle = useSelection((s) => s.toggle);
  // the full list, so a link opens even a collection the filters hide
  const { active, serial, open, close, changeSerial } = useObjektLink<GridObjekt>(
    [objekts ?? []],
    objekts !== undefined,
  );

  useClearSelectionOnNavigate();

  const renderObjekt = useCallback(
    ({ item, rowIndex }: { item: GridObjekt[]; rowIndex: number }) => {
      const objekt = item[0];
      if (!objekt) return null;
      return (
        <ObjektCard
          objekt={objekt}
          selected={ids.has(objekt.id)}
          onToggleSelect={user ? (value) => toggle(value.id) : undefined}
          onOpen={open}
          qty={item.length > 1 ? item.length : undefined}
          priority={rowIndex < 2}
          fetchPriority={rowIndex === 0 ? "high" : undefined}
        >
          {user ? (
            <ObjektCardMenu>
              <AddToListMenuItem objekts={[objekt]} />
            </ObjektCardMenu>
          ) : null}
        </ObjektCard>
      );
    },
    [ids, toggle, user, open],
  );

  return (
    <AddToListProvider>
      <PageHeader title={m.home_title()} description={m.home_description()} />

      <MemberChips />
      <FilterBar facets={facets} groups={groups} />

      {/* drawn while loading too, so the grid under it never moves when the count arrives */}
      <CountBar aside={user && (isPending || filtered.length > 0) && <SelectModeButton />}>
        {isPending ? (
          <span className="invisible" aria-hidden>
            0
          </span>
        ) : (
          <TotalCount count={filtered.length} />
        )}
      </CountBar>

      {isPending ? (
        <SkeletonGrid lead={lead} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MagnifyingGlassIcon}
          title={m.home_empty_title()}
          hint={m.home_empty_hint()}
          action={
            <Button variant="outline" size="sm" onClick={reset}>
              {m.filter_reset_filter()}
            </Button>
          }
        />
      ) : (
        <ObjektVirtualGrid
          objekts={filtered}
          filters={filters}
          rarityMap={rarityMap}
          renderItem={renderObjekt}
        />
      )}

      {user && (
        <SelectBar objekts={filtered}>
          <AddToListAction objekts={filtered} />
        </SelectBar>
      )}
      <ObjektDrawer
        objekt={active}
        serial={serial}
        onSerialChange={changeSerial}
        onClose={close}
        selectable={Boolean(user)}
        menu={user && active ? <AddToListMenuItem objekts={[active]} /> : undefined}
      />
    </AddToListProvider>
  );
}
