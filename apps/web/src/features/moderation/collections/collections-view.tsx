import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import { parseHexColor, type SetCollectionColorsInput } from "@repo/api/schemas/admin";
import type { IndexedObjekt } from "@repo/lib/types/objekt";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useDeferredValue, useId, useState } from "react";
import { WindowVirtualizer } from "virtua";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toastManager } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { When } from "@/features/moderation/console/when";
import { auditActionLabel } from "@/features/moderation/labels";
import { ObjektArtwork } from "@/features/objekt/objekt-artwork";
import { getCollectionShortNo } from "@/features/objekt/objekt-utils";
import { collectionOptions } from "@/features/objekt/queries";
import { orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { type ColorState, colorChange, matchesSearch, type RowColors, rowColors } from "./colors";
import { collectionOverridesOptions } from "./queries";

type AdminData = Outputs["admin"]["collectionOverrides"];
type OverrideRow = AdminData["overrides"][number];
type Listed = IndexedObjekt;
type Draft = { slug: string; text: string; background: string };

const COLUMNS =
  "grid grid-cols-[--spacing(12)_minmax(--spacing(48),1fr)_--spacing(40)_--spacing(40)_--spacing(40)_--spacing(36)] items-center gap-x-3";

export function CollectionsView() {
  const queryClient = useQueryClient();
  const { data: collections } = useQuery(collectionOptions());
  const { data: admin } = useSuspenseQuery(collectionOverridesOptions());
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [overridesOnly, setOverridesOnly] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [unrefreshed, setUnrefreshed] = useState(false);
  const searchId = useId();

  const refetch = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: collectionOverridesOptions().queryKey }),
      // every artist scope: the browser revalidates each against the bumped date
      queryClient.invalidateQueries({ queryKey: ["collections"] }),
    ]);

  const save = useMutation(
    orpc.admin.setCollectionColors.mutationOptions({
      onSuccess: async ({ refreshed }, input) => {
        // the list carries the overrides and refetches slower than they do: without this a reset
        // row shows its old colour as the source's until the list lands
        const source = overrideOf.get(input.slug)?.source;
        queryClient.setQueryData(collectionOptions().queryKey, (list) =>
          list?.map((collection) =>
            collection.slug === input.slug
              ? {
                  ...collection,
                  ...(input.textColor !== undefined && {
                    textColor: input.textColor ?? source?.textColor ?? collection.textColor,
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
  const scope = overridesOnly
    ? admin.overrides.flatMap((row) => bySlug.get(row.slug) ?? [])
    : listed;
  const rows = scope.filter((collection) => matchesSearch(collection, deferredSearch));

  const send = (input: SetCollectionColorsInput) => save.mutate(input);

  return (
    <>
      <PageHeader
        title={m.mod_collections_title()}
        description={m.mod_collections_description()}
        aside={
          <div className="flex flex-wrap items-center gap-3">
            {admin.modifiedAt ? (
              <span className="text-muted-foreground text-xs">
                {m.mod_collections_last_changed()}{" "}
                <When iso={admin.modifiedAt} className="tabular-nums" />
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
          onPressedChange={setOverridesOnly}
        >
          {m.mod_collections_overrides_only()}
        </Toggle>
        <span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
          {collections
            ? m.mod_collections_count({ count: rows.length.toLocaleString(getLocale()) })
            : null}
        </span>
      </div>

      {collections === undefined ? (
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
              <WindowVirtualizer data={rows}>
                {(collection: Listed, index: number) => {
                  const override = overrideOf.get(collection.slug);
                  const colors = rowColors(collection, override);
                  const editing = draft?.slug === collection.slug ? draft : null;
                  return (
                    <div
                      key={collection.slug}
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
                          onSave={(input) => send(input)}
                          onCancel={() => setDraft(null)}
                        />
                      ) : (
                        <ViewRow
                          collection={collection}
                          colors={colors}
                          override={override}
                          busy={save.isPending}
                          onEdit={() =>
                            setDraft({
                              slug: collection.slug,
                              text: colors.text.current,
                              background: colors.background.current,
                            })
                          }
                          onReset={(field) =>
                            send(
                              field === "text"
                                ? { slug: collection.slug, textColor: null }
                                : { slug: collection.slug, backgroundColor: null },
                            )
                          }
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

/** The collection's card in the colours given: its band text, and a corner chip on its background. */
function MiniCard({
  collection,
  text,
  background,
}: {
  collection: Listed;
  text: string;
  background: string;
}) {
  const objekt = { ...collection, textColor: text, backgroundColor: background };
  return (
    // the container sits outside the card: `cqi` (the radius, the chip) measures an ancestor
    <div className="@container w-12">
      <div className="rounded-photocard aspect-photocard relative overflow-hidden">
        <ObjektArtwork objekt={objekt} />
        <span
          aria-hidden
          className="rounded-br-photocard absolute top-0 left-0 px-[6cqi] py-[3cqi] text-[18cqi] leading-none font-semibold"
          style={{ backgroundColor: background, color: text }}
        >
          {getCollectionShortNo(collection)}
        </span>
      </div>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="size-3 shrink-0 rounded-xs border"
      style={{ backgroundColor: color }}
    />
  );
}

function CollectionCell({ collection }: { collection: Listed }) {
  return (
    <div role="cell" className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate font-mono text-xs">{collection.slug}</span>
      <span className="text-muted-foreground truncate text-xs">
        {[collection.artist, collection.season, collection.class].join(" · ")}
      </span>
    </div>
  );
}

function ColorCell({
  state,
  resetLabel,
  busy,
  onReset,
}: {
  state: ColorState;
  resetLabel: string;
  busy: boolean;
  onReset: () => void;
}) {
  return (
    <div role="cell" className="flex flex-col items-start gap-0.5">
      <span className="flex items-center gap-1.5 font-mono text-xs">
        <Swatch color={state.current} />
        {state.current}
      </span>
      {state.overridden ? (
        <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
          <Swatch color={state.source} />
          <span className="sr-only">{m.mod_collections_source_value({ color: state.source })}</span>
          <s aria-hidden>{state.source}</s>
          <Button
            size="xs"
            variant="ghost"
            disabled={busy}
            aria-label={resetLabel}
            onClick={onReset}
          >
            {m.mod_collections_reset()}
          </Button>
        </span>
      ) : null}
    </div>
  );
}

function ViewRow({
  collection,
  colors,
  override,
  busy,
  onEdit,
  onReset,
}: {
  collection: Listed;
  colors: RowColors;
  override: OverrideRow | undefined;
  busy: boolean;
  onEdit: () => void;
  onReset: (field: "text" | "background") => void;
}) {
  return (
    <>
      <div role="cell">
        <MiniCard
          collection={collection}
          text={colors.text.current}
          background={colors.background.current}
        />
      </div>
      <CollectionCell collection={collection} />
      <ColorCell
        state={colors.text}
        busy={busy}
        resetLabel={m.mod_collections_reset_text({ slug: collection.slug })}
        onReset={() => onReset("text")}
      />
      <ColorCell
        state={colors.background}
        busy={busy}
        resetLabel={m.mod_collections_reset_background({ slug: collection.slug })}
        onReset={() => onReset("background")}
      />
      <div role="cell" className="text-muted-foreground text-xs text-pretty">
        {override ? (
          <>
            {override.updatedBy?.identity?.name ? `${override.updatedBy.identity.name} · ` : null}
            <When iso={override.updatedAt} className="tabular-nums" />
          </>
        ) : (
          m.mod_collections_source()
        )}
      </div>
      <div role="cell" className="flex justify-end">
        <Button
          size="xs"
          variant="outline"
          aria-label={m.mod_collections_edit_label({ slug: collection.slug })}
          onClick={onEdit}
        >
          {m.mod_collections_edit()}
        </Button>
      </div>
    </>
  );
}

function HexField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const errorId = useId();
  const valid = parseHexColor(value) !== null;
  return (
    <div role="cell" className="flex flex-col gap-1">
      <Input
        aria-label={label}
        aria-invalid={!valid || undefined}
        aria-describedby={valid ? undefined : errorId}
        className="w-28 font-mono"
        spellCheck={false}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {valid ? null : (
        <span id={errorId} className="text-destructive-foreground max-w-36 text-xs text-pretty">
          {m.mod_collections_hex_invalid()}
        </span>
      )}
    </div>
  );
}

function EditRow({
  collection,
  colors,
  draft,
  saving,
  onDraft,
  onSave,
  onCancel,
}: {
  collection: Listed;
  colors: RowColors;
  draft: Draft;
  saving: boolean;
  onDraft: (draft: Draft) => void;
  onSave: (input: SetCollectionColorsInput) => void;
  onCancel: () => void;
}) {
  const change = colorChange(colors, draft);
  const changed = change !== null && Object.keys(change).length > 0;
  return (
    <>
      <div role="cell">
        <MiniCard
          collection={collection}
          text={parseHexColor(draft.text) ?? colors.text.current}
          background={parseHexColor(draft.background) ?? colors.background.current}
        />
      </div>
      <CollectionCell collection={collection} />
      <HexField
        label={m.mod_collections_text_field({ slug: collection.slug })}
        value={draft.text}
        onChange={(text) => onDraft({ ...draft, text })}
      />
      <HexField
        label={m.mod_collections_background_field({ slug: collection.slug })}
        value={draft.background}
        onChange={(background) => onDraft({ ...draft, background })}
      />
      <div role="cell" />
      <div role="cell" className="flex justify-end gap-1">
        <Button
          size="xs"
          disabled={change === null}
          loading={saving}
          onClick={() => {
            if (change === null) return;
            if (changed) onSave({ slug: collection.slug, ...change });
            else onCancel();
          }}
        >
          {m.common_actions_save()}
        </Button>
        <Button size="xs" variant="ghost" onClick={onCancel}>
          {m.common_modal_cancel()}
        </Button>
      </div>
    </>
  );
}

function colorText(value: unknown) {
  return typeof value === "string" ? value : m.mod_collections_history_source();
}

function History({ history }: { history: AdminData["history"] }) {
  return (
    <section aria-labelledby="collections-history" className="flex flex-col gap-3">
      <h2 id="collections-history" className="text-base font-semibold">
        {m.mod_collections_history()}
      </h2>
      {history.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.mod_collections_history_empty()}</p>
      ) : (
        <ol className="bg-card flex flex-col divide-y rounded-lg border">
          {history.map((entry) => {
            const detail = entry.detail ?? {};
            const slug = typeof detail.slug === "string" ? detail.slug : null;
            const before = (detail.before ?? {}) as Record<string, unknown>;
            const after = (detail.after ?? {}) as Record<string, unknown>;
            const changes = [
              before.textColor !== after.textColor
                ? m.mod_collections_history_text({
                    before: colorText(before.textColor),
                    after: colorText(after.textColor),
                  })
                : null,
              before.backgroundColor !== after.backgroundColor
                ? m.mod_collections_history_background({
                    before: colorText(before.backgroundColor),
                    after: colorText(after.backgroundColor),
                  })
                : null,
            ].filter((change) => change !== null);
            return (
              <li key={entry.id} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{auditActionLabel(entry.action)}</span>
                  {slug ? <span className="font-mono text-xs">{slug}</span> : null}
                  <span className="text-muted-foreground">
                    {entry.actor?.identity?.name ?? m.mod_person_gone()}
                  </span>
                  <When
                    iso={entry.createdAt}
                    className="text-muted-foreground ms-auto text-xs tabular-nums"
                  />
                </span>
                {changes.length > 0 ? (
                  <span className="text-muted-foreground font-mono text-xs">
                    {changes.join(" · ")}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
