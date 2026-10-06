import { ArrowClockwiseIcon, CardsThreeIcon, WarningIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { WindowVirtualizer } from "virtua";

import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useSelectedArtists } from "@/features/artist/use-selected-artists";
import { ActiveChips, type ActiveChip, useActiveChips } from "@/features/filters/active-chips";
import {
  type ExtraFacet,
  ExtraFacetControls,
  FACET_KEYS,
  FacetControls,
  type FacetKey,
  useDeclaredFacets,
  useFacetParity,
} from "@/features/filters/facet-controls";
import { useScopedFacets } from "@/features/filters/facets";
import { QuickFilters } from "@/features/filters/filter-bar";
import { FilterSheet } from "@/features/filters/filter-sheet";
import { OnlineFilter } from "@/features/filters/online-filter";
import { ResetButton } from "@/features/filters/reset-button";
import { canReset } from "@/features/filters/search-schema";
import { useCanonicalFilters, useSetFilters } from "@/features/filters/use-filters";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { getCollectionShortNo } from "@/features/objekt/objekt-utils";
import { useCurrentUser } from "@/features/user/hooks";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { BrowsePost, TagLabel } from "./browse-post";
import { type BrowseSearch, toBrowseInput } from "./browse-search";
import { MyPosts } from "./my-posts";
import { PostListDialog } from "./post-list-dialog";
import { browseOptions } from "./queries";

type PostType = NonNullable<BrowseSearch["type"]> | "all";

const TYPES: PostType[] = ["all", "wtt", "wtb", "wts"];

/** `virtua` measures each post; the gap rides on the item so it is part of the measurement */
const POST_GAP = "pb-3";

export function BrowseView({ search }: { search: BrowseSearch }) {
  const { data: user } = useCurrentUser();
  const { artists } = useCosmoArtist();
  const { data: selected } = useSelectedArtists();
  const input = useMemo(
    () => toBrowseInput(search, artists, selected),
    [search, artists, selected],
  );
  const query = useInfiniteQuery(browseOptions(input));
  const navigate = useNavigate({ from: "/trade/" });
  // the drawer's On Trade link lands on this same page; the new slug closes the drawer
  const [opened, setOpened] = useState<{ objekt: ValidObjekt; slug?: string } | null>(null);
  const active = opened && opened.slug === search.slug ? opened.objekt : null;
  const setActive = (objekt: ValidObjekt | null) =>
    setOpened(objekt ? { objekt, slug: search.slug } : null);
  const [postOpen, setPostOpen] = useState(false);
  // one clock per page load, so every post's "3 hours ago" agrees
  const [now] = useState(Date.now);

  const setSearch = (patch: Partial<BrowseSearch>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
      resetScroll: false,
    });

  const type: PostType = search.type ?? "all";
  const filtering = canReset(search) || search.type !== undefined || search.slug !== undefined;
  const reset = () =>
    void navigate({
      search: (prev) => ({ have: prev.have }),
      replace: true,
      resetScroll: false,
    });
  const viewer = query.data?.pages[0]?.viewer ?? null;
  const posts = useMemo(() => query.data?.pages.flatMap((page) => page.posts) ?? [], [query.data]);
  const collections = useMemo(
    () => Object.assign({}, ...(query.data?.pages.map((page) => page.collections) ?? [])),
    [query.data],
  ) as Record<string, ValidObjekt | undefined>;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-muted-foreground text-sm text-pretty">{m.trade_browse_description()}</p>
        {user ? (
          <Button variant="outline" size="sm" onClick={() => setPostOpen(true)}>
            <CardsThreeIcon />
            {m.trade_post_a_list()}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            render={<Link to="/login" search={{ redirect: "/trade" }} />}
          >
            <CardsThreeIcon />
            {m.trade_post_a_list()}
          </Button>
        )}
      </div>

      {user ? <MyPosts /> : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Tabs
          value={type}
          onValueChange={(value) => {
            const next = TYPES.find((item) => item === value);
            if (next && next !== type) setSearch({ type: next === "all" ? undefined : next });
          }}
          /* a longer locale can outgrow a phone: the strip scrolls, the page does not */
          data-scroll-x
          className="max-w-full [scrollbar-width:none] overflow-x-auto"
        >
          <TabsList aria-label={m.trade_type_label()} className="w-max">
            {TYPES.map((item) => (
              <TabsTab key={item} value={item}>
                {item === "all" ? m.trade_filter_all() : <TagLabel tag={item} />}
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>

        {viewer?.haveOffered ? (
          <Label className="flex items-center gap-2 text-sm font-normal">
            <Switch
              checked={viewer.have}
              onCheckedChange={(checked) => setSearch({ have: checked ? undefined : false })}
            />
            {m.trade_have_toggle()}
          </Label>
        ) : null}
      </div>

      <BrowseFilters
        search={search}
        slugName={search.slug ? collectionName(search.slug, collections) : undefined}
        filtering={filtering}
        onClearSlug={() => setSearch({ slug: undefined })}
        onReset={reset}
      />

      {query.isPending ? (
        <div className="flex flex-col gap-3" aria-busy>
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      ) : query.isError && posts.length === 0 ? (
        <EmptyState
          icon={WarningIcon}
          title={m.common_error_loading_data()}
          action={
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              <ArrowClockwiseIcon />
              {m.common_error_retry()}
            </Button>
          }
        />
      ) : posts.length === 0 && !query.hasNextPage ? (
        <EmptyState
          icon={CardsThreeIcon}
          title={m.trade_browse_empty_title()}
          hint={
            viewer?.have
              ? m.trade_browse_empty_have_hint()
              : filtering
                ? m.trade_browse_empty_hint()
                : m.trade_browse_empty_none_hint()
          }
          action={
            viewer?.have ? (
              <Button variant="outline" size="sm" onClick={() => setSearch({ have: false })}>
                {m.trade_browse_show_every_post()}
              </Button>
            ) : filtering ? (
              <Button variant="outline" size="sm" onClick={reset}>
                {m.filter_reset_filter()}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          role="region"
          aria-label={m.trade_posts_label()}
          aria-busy={query.isPlaceholderData}
          className={cn(query.isPlaceholderData && "opacity-60")}
        >
          <WindowVirtualizer data={posts}>
            {(post: (typeof posts)[number]) => (
              <div key={post.id} className={POST_GAP}>
                <BrowsePost post={post} collections={collections} now={now} onOpen={setActive} />
              </div>
            )}
          </WindowVirtualizer>

          {query.isFetchNextPageError ? (
            <div className="flex justify-center py-4">
              <Button variant="outline" size="sm" onClick={() => void query.fetchNextPage()}>
                <ArrowClockwiseIcon />
                {m.common_error_retry()}
              </Button>
            </div>
          ) : (
            <InfiniteSentinel
              label={m.infinite_query_load_more_aria()}
              endLabel={m.trade_browse_end()}
              hasNextPage={query.hasNextPage}
              isFetchingNextPage={query.isFetchingNextPage}
              fetchNextPage={() => void query.fetchNextPage()}
            />
          )}
        </div>
      )}

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
      {user ? <PostListDialog open={postOpen} onOpenChange={setPostOpen} /> : null}
    </>
  );
}

function collectionName(slug: string, collections: Record<string, ValidObjekt | undefined>) {
  const collection = collections[slug];
  return collection ? `${collection.member} ${getCollectionShortNo(collection)}` : slug;
}

function BrowseFilters({
  search,
  slugName,
  filtering,
  onClearSlug,
  onReset,
}: {
  search: BrowseSearch;
  slugName: string | undefined;
  filtering: boolean;
  onClearSlug: () => void;
  onReset: () => void;
}) {
  const { facets, groups } = useScopedFacets();
  const filters = useCanonicalFilters();
  const setFilters = useSetFilters();
  const chips = useActiveChips();

  const setFacet = (key: FacetKey, value: string[]) =>
    setFilters({ [key]: value.length > 0 ? value : undefined });

  const values = {
    artist: filters.artist ?? [],
    member: filters.member ?? [],
    season: filters.season ?? [],
    class: filters.class ?? [],
    collection: filters.collection ?? [],
  };

  const extras = useMemo<ExtraFacet[]>(
    () => [
      { key: "on_offline", active: (filters.on_offline?.length ?? 0) > 0, Control: OnlineFilter },
    ],
    [filters.on_offline],
  );

  const declaredKeys = useMemo(() => [...FACET_KEYS, ...extras.map((e) => e.key)], [extras]);
  useDeclaredFacets("inline", declaredKeys);
  useFacetParity();

  const nothingToReset = !filtering;

  const slugChip: ActiveChip[] =
    search.slug && slugName
      ? [
          {
            key: "slug",
            label: `${m.trade_collection_chip()}: ${slugName}`,
            name: m.trade_collection_chip(),
            value: slugName,
            mono: slugName === search.slug,
            remove: {},
          },
        ]
      : [];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <QuickFilters>
          <FilterSheet
            facets={facets}
            groups={groups}
            values={values}
            onChange={setFacet}
            extras={extras}
            onReset={onReset}
            resetDisabled={nothingToReset}
          />
          <ExtraFacetControls surface="inline" extras={extras} />
          <FacetControls
            surface="inline"
            facets={facets}
            groups={groups}
            values={values}
            onChange={setFacet}
          />
          <ResetButton onReset={onReset} disabled={nothingToReset} />
        </QuickFilters>
      </div>

      <ActiveChips
        chips={[...slugChip, ...chips]}
        onRemove={(chip) => (chip.key === "slug" ? onClearSlug() : setFilters(chip.remove))}
      />
    </>
  );
}
