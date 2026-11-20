import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import type { Inputs } from "@repo/api";
import { COLLECTION_BATCH_LIMIT, type SetCollectionColorsInput } from "@repo/api/schemas/admin";
import type { IndexedObjekt } from "@repo/lib/types/objekt";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useDeferredValue, useId, useRef, useState } from "react";
import { WindowVirtualizer } from "virtua";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toastManager } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { When } from "@/features/moderation/console/when";
import { COLLECTIONS_KEY, collectionOptions } from "@/features/objekt/queries";
import { formatCount } from "@/lib/number";
import { client, LOADER_READ_STALE_MS, orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { matchesSearch, provenBySiblings, rowColors } from "./colors";
import { CosmoMediaSummary } from "./cosmo-media-summary";
import { differsCount } from "./differs";
import { DiffersList } from "./differs-list";
import { type Draft, EditRow } from "./edit-row";
import { History } from "./history";
import { collectionOverridesOptions, collectionSuggestionsOptions } from "./queries";
import { SuggestionsList } from "./suggestions-list";
import { useRowFocus } from "./use-row-focus";
import { type ColorField, ViewRow } from "./view-row";

type Listed = IndexedObjekt;
type ManyEntry = Inputs["admin"]["setCollectionColorsMany"]["entries"][number];
type View = "all" | "overrides" | "differs" | "suggestions";

const COLUMNS =
  "grid grid-cols-[--spacing(12)_minmax(--spacing(48),1fr)_--spacing(40)_--spacing(40)_--spacing(40)_--spacing(36)] items-center gap-x-3";

export function CollectionsView() {
  const queryClient = useQueryClient();
  const { data: collections } = useQuery(collectionOptions());
  const { data: admin } = useSuspenseQuery(collectionOverridesOptions());
  const suggestions = useQuery(collectionSuggestionsOptions());
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [view, setView] = useState<View>("all");
  const overridesOnly = view === "overrides";
  const [hideProven, setHideProven] = useState(false);
  const toggleView = (next: View) => (pressed: boolean) => setView(pressed ? next : "all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [unrefreshed, setUnrefreshed] = useState(false);
  const searchId = useId();
  // the latest Edit wins: a slower Cosmo lookup for an earlier row must not replace its draft
  const editRequest = useRef(0);

  const refetch = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: collectionOverridesOptions().queryKey }),
      queryClient.invalidateQueries({ queryKey: collectionSuggestionsOptions().queryKey }),
      // every artist scope: the browser revalidates each against the bumped date
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_KEY }),
    ]);

  const save = useMutation(
    orpc.admin.setCollectionColors.mutationOptions({
      onSuccess: async ({ refreshed }, input) => {
        // the list carries the overrides and refetches slower than they do: without this a reset
        // row shows its old colour as the source's until the list lands
        const override = overrideOf.get(input.slug);
        const source = override?.source;
        queryClient.setQueryData(collectionOptions().queryKey, (list) =>
          list?.map((collection) =>
            collection.slug === input.slug
              ? {
                  ...collection,
                  ...(input.textColor !== undefined && {
                    textColor:
                      input.textColor ??
                      override?.cosmo.textColor ??
                      source?.textColor ??
                      collection.textColor,
                  }),
                  ...(input.backgroundColor !== undefined && {
                    backgroundColor:
                      input.backgroundColor ??
                      source?.backgroundColor ??
                      collection.backgroundColor,
                  }),
                }
              : collection,
          ),
        );
        await refetch();
        setUnrefreshed(!refreshed);
        setDraft((current) => (current?.slug === input.slug ? null : current));
        if (refreshed) {
          toastManager.add({
            type: "success",
            title: m.mod_collections_saved({ slug: input.slug }),
          });
        }
      },
      onError: (error) => {
        toastManager.add({ type: "error", title: refusalText(error) });
      },
    }),
  );

  // a group or a suggestion can name more rows than one call takes
  const saveMany = useMutation({
    mutationFn: async (entries: ManyEntry[]) => {
      const result = {
        saved: [] as string[],
        skipped: [] as string[],
        failed: [] as string[],
        refreshed: true,
      };
      for (let i = 0; i < entries.length; i += COLLECTION_BATCH_LIMIT) {
        const slice = entries.slice(i, i + COLLECTION_BATCH_LIMIT);
        const part = await client.admin
          .setCollectionColorsMany({ entries: slice })
          .catch(() => null);
        if (part === null) {
          // keep what earlier chunks saved; this chunk and the rest are reported as not saved
          result.failed.push(...entries.slice(i).map((entry) => entry.slug));
          break;
        }
        result.saved.push(...part.saved);
        result.skipped.push(...part.skipped);
        result.failed.push(...part.failed);
        if (part.saved.length > 0) result.refreshed &&= part.refreshed;
      }
      return result;
    },
    onSuccess: async ({ saved, skipped, failed, refreshed }) => {
      await refetch();
      if (saved.length > 0) {
        setUnrefreshed(!refreshed);
        if (refreshed) {
          toastManager.add({
            type: "success",
            title: m.mod_collections_group_saved({ count: formatCount(saved.length) }),
          });
        }
      }
      if (skipped.length > 0) {
        toastManager.add({
          type: "warning",
          title: m.mod_collections_group_skipped({
            count: formatCount(skipped.length),
            slugs: skipped.join(", "),
          }),
        });
      }
      if (failed.length > 0) {
        toastManager.add({
          type: "error",
          title: m.mod_collections_group_failed({
            count: formatCount(failed.length),
            slugs: failed.join(", "),
          }),
        });
      }
    },
    onError: async (error) => {
      await refetch();
      toastManager.add({ type: "error", title: refusalText(error) });
    },
  });

  const refresh = useMutation(
    orpc.admin.refreshCollections.mutationOptions({
      onSuccess: async ({ refreshed }) => {
        if (!refreshed) {
          toastManager.add({ type: "error", title: m.mod_collections_refresh_failed() });
          return;
        }
        setUnrefreshed(false);
        await refetch();
        toastManager.add({ type: "success", title: m.mod_collections_refreshed() });
      },
      onError: () => {
        toastManager.add({ type: "error", title: m.mod_collections_refresh_failed() });
      },
    }),
  );

  const overrideOf = new Map(admin.overrides.map((row) => [row.slug, row]));
  const listed = collections ?? [];
  const bySlug = new Map(listed.map((collection) => [collection.slug, collection]));
  const proven = admin.overrides.filter(provenBySiblings).length;
  const scope = overridesOnly
    ? admin.overrides.flatMap((row) =>
        hideProven && provenBySiblings(row) ? [] : (bySlug.get(row.slug) ?? []),
      )
    : listed;
  const rows = scope.filter((collection) => matchesSearch(collection, deferredSearch));

  const { table, virtualizer, focusLeftRow, focusControl } = useRowFocus(rows);

  // these run once the mutation's own callbacks have refetched and closed the row
  const saveDraft = (input: SetCollectionColorsInput) =>
    save.mutate(input, {
      onSuccess: () => {
        if (focusLeftRow(input.slug)) focusControl(input.slug, "edit");
      },
      onError: () => {
        if (focusLeftRow(input.slug)) focusControl(input.slug, "save");
      },
    });
  // a reset removes its own button, and disables it while it runs
  const resetColor = (slug: string, field: ColorField) =>
    save.mutate(field === "text" ? { slug, textColor: null } : { slug, backgroundColor: null }, {
      onSuccess: () => {
        if (focusLeftRow(slug)) focusControl(slug, "edit");
      },
      onError: () => {
        if (focusLeftRow(slug)) focusControl(slug, `reset-${field}`);
      },
    });

  return (
    <>
      <PageHeader
        title={m.mod_collections_title()}
        description={m.mod_collections_description()}
        aside={
          <div className="flex flex-wrap items-center gap-3">
            {admin.modifiedAt ? (
              <span className="text-muted-foreground text-xs">
                {m.mod_collections_last_changed()} <When iso={admin.modifiedAt} />
              </span>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              loading={refresh.isPending}
              onClick={() => refresh.mutate({})}
            >
              <ArrowsClockwiseIcon />
              {m.mod_collections_refresh()}
            </Button>
          </div>
        }
      />

      <CosmoMediaSummary />

      {unrefreshed ? (
        <div
          role="status"
          className="border-warning/32 bg-warning/8 text-warning-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
        >
          <span className="text-pretty">{m.mod_collections_not_refreshed()}</span>
          <Button
            variant="outline"
            size="sm"
            loading={refresh.isPending}
            onClick={() => refresh.mutate({})}
          >
            <ArrowsClockwiseIcon />
            {m.mod_collections_refresh()}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={searchId} className="sr-only">
          {m.mod_collections_search()}
        </label>
        <Input
          id={searchId}
          type="search"
          className="max-w-xs"
          placeholder={m.mod_collections_search_placeholder()}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Toggle
          variant="outline"
          size="sm"
          pressed={overridesOnly}
          onPressedChange={toggleView("overrides")}
        >
          {m.mod_collections_overrides_only()}
        </Toggle>
        {overridesOnly ? (
          <Toggle variant="outline" size="sm" pressed={hideProven} onPressedChange={setHideProven}>
            {m.mod_collections_hide_proven({ count: formatCount(proven) })}
          </Toggle>
        ) : null}
        <Toggle
          variant="outline"
          size="sm"
          pressed={view === "differs"}
          onPressedChange={toggleView("differs")}
        >
          {m.mod_collections_differs({ count: formatCount(differsCount(admin.overrides)) })}
        </Toggle>
        <Toggle
          variant="outline"
          size="sm"
          pressed={view === "suggestions"}
          onPressedChange={toggleView("suggestions")}
        >
          {m.mod_collections_suggestions({
            count: suggestions.data ? formatCount(suggestions.data.length) : "…",
          })}
        </Toggle>
        {view === "all" || view === "overrides" ? (
          <span className="text-muted-foreground text-xs" aria-live="polite">
            {collections ? m.mod_collections_count({ count: formatCount(rows.length) }) : null}
          </span>
        ) : null}
      </div>

      {view === "differs" ? (
        <DiffersList
          overrides={admin.overrides}
          busy={saveMany.isPending}
          onSave={(entries) => saveMany.mutate(entries)}
        />
      ) : view === "suggestions" ? (
        <SuggestionsList
          suggestions={suggestions.data}
          failed={suggestions.isError}
          busy={saveMany.isPending}
          onSave={(entries) => saveMany.mutate(entries)}
        />
      ) : collections === undefined ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {overridesOnly && admin.overrides.length === 0
            ? m.mod_collections_no_overrides()
            : m.mod_collections_empty()}
        </p>
      ) : (
        <div className="overflow-x-auto" data-scroll-x>
          <div
            ref={table}
            role="table"
            aria-label={m.mod_collections_title()}
            aria-rowcount={rows.length + 1}
            className="bg-card min-w-max rounded-xl border text-sm"
          >
            <div role="rowgroup">
              <div
                role="row"
                aria-rowindex={1}
                className={cn(
                  COLUMNS,
                  "text-muted-foreground border-b px-3 py-2 text-xs font-medium",
                )}
              >
                <span role="columnheader">
                  <span className="sr-only">{m.mod_collections_column_card()}</span>
                </span>
                <span role="columnheader">{m.mod_collections_column_collection()}</span>
                <span role="columnheader">{m.mod_collections_column_text()}</span>
                <span role="columnheader">{m.mod_collections_column_background()}</span>
                <span role="columnheader">{m.mod_collections_column_changed()}</span>
                <span role="columnheader">
                  <span className="sr-only">{m.mod_collections_column_actions()}</span>
                </span>
              </div>
            </div>
            <div role="rowgroup">
              <WindowVirtualizer ref={virtualizer} data={rows}>
                {(collection: Listed, index: number) => {
                  const override = overrideOf.get(collection.slug);
                  const colors = rowColors(collection, override);
                  const editing = draft?.slug === collection.slug ? draft : null;
                  return (
                    <div
                      key={collection.slug}
                      data-row={collection.slug}
                      role="row"
                      aria-rowindex={index + 2}
                      className={cn(COLUMNS, "border-b px-3 py-2 last:border-b-0")}
                    >
                      {editing ? (
                        <EditRow
                          collection={collection}
                          colors={colors}
                          draft={editing}
                          saving={save.isPending}
                          onDraft={setDraft}
                          onSave={saveDraft}
                          onCancel={() => {
                            setDraft(null);
                            focusControl(collection.slug, "edit");
                          }}
                        />
                      ) : (
                        <ViewRow
                          collection={collection}
                          colors={colors}
                          override={override}
                          busy={save.isPending}
                          onEdit={async () => {
                            const request = ++editRequest.current;
                            // the list carries Cosmo's text colour only for overridden rows
                            const cosmoText = override
                              ? override.cosmo.textColor
                              : await queryClient
                                  .fetchQuery(
                                    orpc.admin.collection.queryOptions({
                                      input: { slug: collection.slug },
                                      staleTime: LOADER_READ_STALE_MS,
                                    }),
                                  )
                                  .then(
                                    (one) => one.cosmo.textColor,
                                    () => null,
                                  );
                            if (request !== editRequest.current) return;
                            setDraft({
                              slug: collection.slug,
                              text: colors.text.current,
                              background: colors.background.current,
                              textPinned: override ? colors.text.pinByDefault : cosmoText !== null,
                              backgroundPinned: colors.background.pinByDefault,
                            });
                            focusControl(collection.slug, "input");
                          }}
                          onReset={(field) => resetColor(collection.slug, field)}
                        />
                      )}
                    </div>
                  );
                }}
              </WindowVirtualizer>
            </div>
          </div>
        </div>
      )}

      <History history={admin.history} />
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function CollectionsSkeleton() {
  return (
    <>
      <PageHeader title={m.mod_collections_title()} description={m.mod_collections_description()} />
      <Skeleton className="h-8 w-80" />
      <TableSkeleton />
    </>
  );
}
