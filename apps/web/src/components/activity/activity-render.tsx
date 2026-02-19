"use client";

import type { IconProps } from "@phosphor-icons/react";
import { ArrowsClockwiseIcon, LeafIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import {
  type InfiniteData,
  QueryErrorResetBoundary,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { ofetch } from "ofetch";
import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import useWebSocket from "react-use-websocket";

import { env } from "@/env";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { mapObjektWithTag } from "@/lib/objekt-utils";
import type { ActivityData, ActivityResponse } from "@/lib/universal/activity";
import { getBaseURL } from "@/lib/utils";
import { cn } from "@/utils/classes";

import ErrorFallbackRender from "../error-boundary";
import { InfiniteQueryNext } from "../infinite-query-pending";
import ObjektModal, { useObjektModal } from "../objekt/objekt-modal";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Loader } from "../ui/loader";
import UserLink from "../user-link";
import ActivityFilter from "./activity-filter";
import { useTypeFilter } from "./filter-type";
import { type EventType, filterData, getEventType } from "./utils";

type WebSocketMessage =
  | { type: "transfer"; data: ActivityData[] }
  | { type: "history"; data: ActivityData[] };

const ROW_HEIGHT = 42;
const ANIMATION_DURATION = 1500;

const EVENT_CONFIG: Record<
  EventType,
  {
    icon: React.ComponentType<IconProps>;
    labelKey: string;
    className: string;
  }
> = {
  mint: {
    icon: LeafIcon,
    labelKey: "activity.event_type.mint",
    className:
      "[--badge-bg:var(--color-lime-500)]/15 [--badge-fg:var(--color-lime-700)] [--badge-overlay:var(--color-lime-500)]/20 dark:[--badge-fg:var(--color-lime-300)]",
  },
  spin: {
    icon: ArrowsClockwiseIcon,
    labelKey: "activity.event_type.spin",
    className:
      "[--badge-bg:var(--color-indigo-500)]/15 [--badge-fg:var(--color-indigo-700)] [--badge-overlay:var(--color-indigo-500)]/20 dark:[--badge-fg:var(--color-indigo-300)]",
  },
  transfer: {
    icon: PaperPlaneTiltIcon,
    labelKey: "activity.event_type.transfer",
    className:
      "[--badge-bg:var(--color-rose-500)]/15 [--badge-fg:var(--color-rose-700)] [--badge-overlay:var(--color-rose-500)]/20 dark:[--badge-fg:var(--color-rose-300)]",
  },
};

export default dynamic(() => Promise.resolve(ActivityRender), {
  ssr: false,
});

function ActivityRender() {
  const t = useTranslations("activity");
  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">{t("title")}</h2>
          <Badge intent="primary">{t("beta")}</Badge>
        </div>
        <p className="text-muted-fg text-sm">{t("description")}</p>
      </div>
      <ObjektModalProvider initialTab="trades">
        <ActivityFilter />

        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
              <Suspense
                fallback={
                  <div className="flex justify-center">
                    <Loader variant="ring" />
                  </div>
                }
              >
                <Activity />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ObjektModalProvider>
    </div>
  );
}

function Activity() {
  const t = useTranslations("activity");
  const queryClient = useQueryClient();
  const { getSelectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();
  const [type] = useTypeFilter();
  const [realtimeTransfers, setRealtimeTransfers] = useState<ActivityData[]>([]);
  const [newTransferIds, setNewTransferIds] = useState<Set<string>>(new Set());
  const [isHovering, setIsHovering] = useState(false);
  const [queuedTransfers, setQueuedTransfers] = useState<ActivityData[]>([]);
  const parentRef = useRef<HTMLDivElement>(null);
  const isHoveringRef = useRef(false);
  const [currentObjekt, setCurrentObjekt] = useState<ValidObjekt[]>([]);

  const parsedSelectedArtistIds = getSelectedArtistIds(filters.artist);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, isPending, isRefetching } =
    useInfiniteQuery<ActivityResponse>({
      queryKey: ["activity", type, filters, parsedSelectedArtistIds],
      queryFn: async ({ pageParam, signal }) => {
        const url = new URL("/api/activity", getBaseURL());
        const response = await ofetch<ActivityResponse>(url.toString(), {
          query: {
            cursor: pageParam ? JSON.stringify(pageParam) : undefined,
            type: type ?? undefined,
            artist: parsedSelectedArtistIds ?? [],
            member: filters.member ?? [],
            season: filters.season ?? [],
            class: filters.class ?? [],
            on_offline: filters.on_offline ?? [],
            collection: filters.collection ?? [],
          },
          signal,
        });

        return Object.assign({}, response, {
          items: response.items.map((item) =>
            Object.assign({}, item, { objekt: mapObjektWithTag(item.objekt) }),
          ),
        });
      },
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });

  const { lastJsonMessage, sendJsonMessage } = useWebSocket<WebSocketMessage>(
    !(isPending || isRefetching) ? env.NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL : null,
    {
      shouldReconnect: () => true,
      reconnectAttempts: Infinity,
      reconnectInterval: 3000,
    },
  );

  const transfers = useMemo(
    () => [...realtimeTransfers, ...(data?.pages ?? []).flatMap((page) => page.items)],
    [realtimeTransfers, data?.pages],
  );

  const rowVirtualizer = useWindowVirtualizer({
    count: transfers.length,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  });

  const markAsNew = useCallback((items: ActivityData[]) => {
    const ids = items.map((d) => d.transfer.id);

    setNewTransferIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });

    // schedule removal after animation completes
    setTimeout(() => {
      setNewTransferIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }, ANIMATION_DURATION);
  }, []);

  const handleWebSocketMessage = useCallback(
    (message: WebSocketMessage) => {
      const filtered = filterData(
        message.data.map((item) =>
          Object.assign({}, item, { objekt: mapObjektWithTag(item.objekt) }),
        ),
        type ?? "all",
        {
          ...filters,
          artist: parsedSelectedArtistIds,
        },
      );

      if (message.type === "transfer") {
        if (isHoveringRef.current) {
          setQueuedTransfers((prev) => [...filtered, ...prev]);
        } else {
          markAsNew(filtered);
          setRealtimeTransfers((prev) => [...filtered, ...prev]);
        }
      }

      if (message.type === "history") {
        const latestData = queryClient.getQueryData<InfiniteData<ActivityResponse>>([
          "activity",
          type,
          filters,
          parsedSelectedArtistIds,
        ]);
        const existHash = new Set((latestData?.pages[0]?.items ?? []).map((a) => a.transfer.hash));
        const deduped = filtered.filter((a) => !existHash.has(a.transfer.hash));

        if (isHoveringRef.current) {
          setQueuedTransfers(deduped);
        } else {
          markAsNew(deduped);
          setRealtimeTransfers(deduped);
        }
      }
    },
    [type, filters, parsedSelectedArtistIds, markAsNew, queryClient],
  );

  // handle incoming message
  useEffect(() => {
    if (lastJsonMessage) {
      handleWebSocketMessage(lastJsonMessage);
    }
  }, [lastJsonMessage, handleWebSocketMessage]);

  // clear realtime on query key changes
  useEffect(() => {
    setRealtimeTransfers([]);
    setNewTransferIds(new Set());
    setQueuedTransfers([]);
  }, [type, filters, parsedSelectedArtistIds]);

  // send history request to websocket on query success
  useEffect(() => {
    if (isPending || isRefetching) return;
    if (status === "success") {
      sendJsonMessage({ type: "request_history" });
    }
  }, [status, isPending, isRefetching, sendJsonMessage]);

  // flush queued transfers when hover ends
  useEffect(() => {
    if (!isHovering && queuedTransfers.length > 0) {
      markAsNew(queuedTransfers);
      setRealtimeTransfers((prev) => [...queuedTransfers, ...prev]);
      setQueuedTransfers([]);
    }
  }, [isHovering, queuedTransfers, markAsNew]);

  if (isPending || isRefetching) {
    return (
      <div className="flex justify-center py-2">
        <Loader variant="ring" />
      </div>
    );
  }

  return (
    <>
      <Card className="py-0">
        <div className="relative w-full overflow-x-auto text-sm" ref={parentRef}>
          <div className="flex min-w-fit border-b">
            <div className="min-w-[120px] flex-1 px-3 py-2.5">{t("table.event")}</div>
            <div className="min-w-[250px] flex-1 px-3 py-2.5">{t("table.objekt")}</div>
            <div className="max-w-[130px] min-w-[100px] flex-1 px-3 py-2.5">
              {t("table.serial")}
            </div>
            <div className="min-w-[300px] flex-1 px-3 py-2.5">{t("table.from")}</div>
            <div className="min-w-[300px] flex-1 px-3 py-2.5">{t("table.to")}</div>
            <div className="min-w-[250px] flex-1 px-3 py-2.5">{t("table.time")}</div>
          </div>

          <ObjektModal objekts={currentObjekt}>
            <div
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              className="relative min-w-fit"
              role="region"
              aria-label={t("table.aria_label")}
              onMouseEnter={() => {
                setIsHovering(true);
                isHoveringRef.current = true;
              }}
              onMouseLeave={() => {
                setIsHovering(false);
                isHoveringRef.current = false;
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = transfers[virtualRow.index];
                if (!item) return null;
                const isNew = newTransferIds.has(item.transfer.id);
                return (
                  <div
                    className={cn(
                      "absolute top-0 left-0 min-w-full overflow-hidden will-change-transform",
                      isNew &&
                        "slide-in-from-top animate-in duration-300 ease-out-quint *:animate-live-animation-bg",
                    )}
                    key={item.transfer.id}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${
                        virtualRow.start - rowVirtualizer.options.scrollMargin
                      }px)`,
                    }}
                  >
                    <ActivityRow item={item} setCurrentObjekt={setCurrentObjekt} />
                  </div>
                );
              })}
            </div>
          </ObjektModal>

          {isHovering && (
            <div className="bg-fg/10 pointer-events-none fixed right-0 bottom-0 left-0 flex h-12 w-full flex-col justify-center px-2 py-3 backdrop-blur-md">
              <span className="text-center font-mono text-sm leading-tight uppercase">
                {t("paused_on_hover")}
              </span>
            </div>
          )}
        </div>
      </Card>
      <InfiniteQueryNext
        status={status}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  );
}

const ActivityRow = memo(function ActivityRow({
  item,
  setCurrentObjekt,
}: {
  item: ActivityData;
  setCurrentObjekt: (objekts: ValidObjekt[]) => void;
}) {
  const t = useTranslations();
  const ctx = useObjektModal();

  const openObjekt = useCallback(() => {
    setCurrentObjekt([item.objekt]);
    ctx.handleClick();
  }, [item.objekt, setCurrentObjekt, ctx]);

  const event = getEventType(item.transfer.from, item.transfer.to);
  const config = EVENT_CONFIG[event];
  const Icon = config.icon;

  return (
    <div className="flex min-w-fit items-center border-b">
      <div className="min-w-[120px] flex-1 px-3 py-2.5">
        <div className="flex items-center gap-2 font-semibold">
          <Icon size={18} weight="light" />
          <Badge className={cn("text-xs", config.className)}>{t(config.labelKey as any)}</Badge>
        </div>
      </div>
      <div
        role="none"
        className="min-w-[250px] flex-1 cursor-pointer px-3 py-2.5"
        onClick={openObjekt}
      >
        {item.objekt.collectionId}
      </div>
      <div className="max-w-[130px] min-w-[100px] flex-1 px-3 py-2.5">{item.objekt.serial}</div>
      <div className="min-w-[300px] flex-1 px-3 py-2.5">
        {event === "mint" ? (
          <span className="text-muted-fg font-mono">{t("activity.cosmo")}</span>
        ) : (
          <UserLink address={item.transfer.from} nickname={item.nickname.from} />
        )}
      </div>
      <div className="min-w-[300px] flex-1 px-3 py-2.5">
        {event === "spin" ? (
          <span className="text-muted-fg font-mono">{t("activity.cosmo_spin")}</span>
        ) : (
          <UserLink address={item.transfer.to} nickname={item.nickname.to} />
        )}
      </div>
      <div className="min-w-[250px] flex-1 px-3 py-2.5">
        {format(item.transfer.timestamp, "yyyy/MM/dd hh:mm:ss a")}
      </div>
    </div>
  );
});
