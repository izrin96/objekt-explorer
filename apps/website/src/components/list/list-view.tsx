import type { ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { createContext, useCallback, useMemo, useState, use } from "react";
import { createPortal } from "react-dom";
import { ErrorBoundary } from "react-error-boundary";

import { GenerateDiscordButton } from "@/components/shared/generate-discord-button";
import { isComparing, useCompareFilters } from "@/hooks/use-compare-filters";
import { useConfigStore } from "@/hooks/use-config";
import { useListObjekts } from "@/hooks/use-list-objekt";
import { useListTarget } from "@/hooks/use-list-target";
import { useCurrentUser, useListAuthed } from "@/hooks/use-user";
import type { PublicList } from "@/lib/universal/list";
import { m } from "@/paraglide/messages";

import { ObjektCount } from "../collection/objekt-count";
import { ObjektGridView, ObjektGridActions } from "../collection/objekt-grid";
import { ObjektViewProvider } from "../collection/objekt-view-provider";
import { ObjektVirtualGrid } from "../collection/objekt-virtual-grid";
import { CompareButton } from "../compare/compare-button";
import { FilterContainer } from "../filters/filter-container";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { Button } from "../intentui/button";
import { Loader } from "../intentui/loader";
import { Note } from "../intentui/note";
import {
  AddToList,
  AddToListMenu,
  RemoveFromList,
  RemoveFromListMenu,
} from "../objekt/actions/list";
import { SetPrice, SetPriceMenuItem } from "../objekt/actions/price";
import { SelectMenuItem } from "../objekt/actions/select";
import { ObjektStaticMenu } from "../objekt/actions/static-menu";
import ErrorFallbackRender from "../router/error-boundary";
import { ExportButton } from "./export-button";
import Filter from "./filter";
import { SetPriceModal } from "./modal/set-price-modal";

export default function ListRender() {
  const list = useListTarget()!;
  const [selectTarget, setSelectTarget] = useState<HTMLDivElement | null>(null);
  const [discordTarget, setDiscordTarget] = useState<HTMLDivElement | null>(null);

  return (
    <ObjektViewProvider
      initialColumn={list.gridColumns ?? undefined}
      modalTab={list.isProfileBind && !list.hideSerial ? "owned" : "trades"}
    >
      <SetPriceProvider>
        <div className="flex flex-col gap-4">
          <ListFilter list={list} selectRef={setSelectTarget} discordRef={setDiscordTarget} />

          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
                <ListView list={list} selectTarget={selectTarget} discordTarget={discordTarget} />
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </div>
      </SetPriceProvider>
    </ObjektViewProvider>
  );
}

const SetPriceContext = createContext<{ openSetPrice: (val: ValidObjekt[]) => void }>({
  openSetPrice: () => {},
});

function SetPriceProvider({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ValidObjekt[]>([]);

  const openSetPrice = useCallback((val: ValidObjekt[]) => {
    setSelected(val);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openSetPrice }), [openSetPrice]);

  return (
    <SetPriceContext value={value}>
      <SetPriceModal open={open} setOpen={setOpen} objekts={selected} />
      {children}
    </SetPriceContext>
  );
}

function ListFilter({
  selectRef,
  discordRef,
  list,
}: {
  selectRef: (el: HTMLDivElement | null) => void;
  discordRef: (el: HTMLDivElement | null) => void;
  list: PublicList;
}) {
  return (
    <FilterContainer>
      <div className="flex w-full flex-col gap-4">
        <Filter discordRef={discordRef} />
        <div className="flex flex-wrap gap-2">
          <CompareButton
            sourceList={{
              id: list.slug,
              name: list.name,
            }}
          />
          <ExportButton list={list} />
        </div>
        <div className="contents" ref={selectRef} />
      </div>
    </FilterContainer>
  );
}

function CompareBanner({
  compare,
  onClear,
  error,
}: {
  compare: ReturnType<typeof useCompareFilters>[0];
  onClear: () => void;
  error?: Error | null;
}) {
  if (error) {
    return (
      <Note intent="warning">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-medium">{error.message}</span>
          <Button intent="outline" size="sm" onPress={onClear}>
            {m.common_modal_cancel()}
          </Button>
        </div>
      </Note>
    );
  }

  return (
    <div className="border-border bg-secondary/50 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
      <div className="flex flex-col gap-1">
        <span className="text-fg font-medium">
          {compare.cmp_mode === "missing"
            ? m.compare_view_showing_missing()
            : m.compare_view_showing_matches()}
        </span>
        <span className="text-muted-fg text-xs">
          {m.compare_view_target_label()}: <span className="text-fg">{compare.cmp_to}</span>
          {` (${compare.cmp_type === "list" ? m.compare_view_type_list() : m.compare_view_type_profile()})`}
        </span>
      </div>
      <Button intent="outline" size="sm" onPress={onClear}>
        {m.common_modal_cancel()}
      </Button>
    </div>
  );
}

function ListView({
  selectTarget,
  discordTarget,
  list,
}: {
  selectTarget: HTMLDivElement | null;
  discordTarget: HTMLDivElement | null;
  list: PublicList;
}) {
  const { data: user } = useCurrentUser();
  const isOwned = useListAuthed();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const [compare, setCompare] = useCompareFilters();
  const { filtered, grouped, filters, rarityMap, isPending, isError, error } = useListObjekts();
  const { openSetPrice } = use(SetPriceContext);
  const comparing = isComparing(compare);
  const clearCompare = useCallback(
    () => void setCompare({ cmp_type: null, cmp_to: null, cmp_mode: null }),
    [setCompare],
  );

  const renderObjekt = useCallback(
    ({ item, rowIndex }: { item: ValidObjekt[]; rowIndex: number }) => {
      const objekt = item[0];
      if (!objekt) return null;

      return (
        <ObjektGridView
          objekts={item}
          hideLabel={hideLabel}
          showCount
          showSerial={!filters.grouped && list.isProfileBind && !list.hideSerial}
          listCurrency={list.currency}
          onSetPrice={isOwned ? () => openSetPrice(item) : undefined}
          isPriority={rowIndex < 3}
          staticMenu={
            user && (
              <ObjektStaticMenu>
                <SelectMenuItem objekts={item} />
                {isOwned && <RemoveFromListMenu objekts={item} />}
                {isOwned && list.currency && (
                  <SetPriceMenuItem onAction={() => openSetPrice(item)} />
                )}
                <AddToListMenu objekts={[objekt]} />
              </ObjektStaticMenu>
            )
          }
        >
          {user && (
            <ObjektGridActions objekts={item}>
              {isOwned && <RemoveFromListMenu objekts={item} />}
              {isOwned && list.currency && <SetPriceMenuItem onAction={() => openSetPrice(item)} />}
              <AddToListMenu objekts={[objekt]} />
            </ObjektGridActions>
          )}
        </ObjektGridView>
      );
    },
    [
      user,
      hideLabel,
      isOwned,
      list.currency,
      list.isProfileBind,
      list.hideSerial,
      filters.grouped,
      openSetPrice,
    ],
  );

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        {comparing && <CompareBanner compare={compare} onClear={clearCompare} />}
        <div className="flex justify-center">
          <Loader variant="ring" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <CompareBanner compare={compare} onClear={clearCompare} error={error} />;
  }

  return (
    <>
      {comparing && <CompareBanner compare={compare} onClear={clearCompare} />}

      {user && (
        <FloatingSelectMode objekts={filtered}>
          {isOwned && <RemoveFromList size="sm" />}
          {isOwned && list.currency && <SetPrice size="sm" />}
          <AddToList size="sm" />
        </FloatingSelectMode>
      )}

      {user &&
        selectTarget &&
        createPortal(
          <SelectMode objekts={filtered}>
            {isOwned && <RemoveFromList />}
            {isOwned && list.currency && <SetPrice />}
            <AddToList />
          </SelectMode>,
          selectTarget,
        )}

      {discordTarget && createPortal(<GenerateDiscordButton objekts={filtered} />, discordTarget)}

      <ObjektCount filtered={filtered} grouped={filters.grouped ? grouped : undefined} />
      <ObjektVirtualGrid
        objekts={filtered}
        filters={filters}
        rarityMap={rarityMap}
        renderItem={renderObjekt}
      />
    </>
  );
}
