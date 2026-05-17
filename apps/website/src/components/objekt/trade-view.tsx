import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import {
  CaretLeftIcon,
  CaretLineLeftIcon,
  CaretLineRightIcon,
  CaretRightIcon,
  CopyIcon,
  LockIcon,
  QuestionMarkIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useAsyncList } from "@react-stately/data";
import { Addresses } from "@repo/lib";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ofetch } from "ofetch";
import { Suspense, useCallback, useEffect, useState } from "react";
import { NumberField as NumberFieldPrimitive } from "react-aria-components/NumberField";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import type { ObjektTransferResult } from "@/lib/types/objekt";
import { m } from "@/paraglide/messages";

import ErrorFallbackRender from "../error-boundary";
import { Badge } from "../intentui/badge";
import { Button } from "../intentui/button";
import { Card, CardContent } from "../intentui/card";
import { Input, InputGroup } from "../intentui/input";
import { ExternalLink } from "../intentui/link";
import { Loader } from "../intentui/loader";
import { Skeleton } from "../intentui/skeleton";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "../intentui/table";
import UserLink from "../user-link";

type TradeViewProps = {
  objekt: ValidObjekt;
  serial: number | null;
};

export default function TradeView({ ...props }: TradeViewProps) {
  return (
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
            <TradeViewRender {...props} />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function TradeViewRender({ objekt, serial }: TradeViewProps) {
  const { data } = useSuspenseQuery({
    queryKey: ["objekts", "list", objekt.slug],
    queryFn: () => {
      return ofetch<{ serials: number[] }>(`/api/objekts/list/${objekt.slug}`).then(
        (res) => res.serials,
      );
    },
  });

  return (
    <>
      {data.length > 0 && (
        <Trades serials={data} initialSerial={serial ?? data[0] ?? 1} objekt={objekt} />
      )}
    </>
  );
}

function Trades({
  serials,
  initialSerial,
  objekt,
}: {
  serials: number[];
  initialSerial: number;
  objekt: ValidObjekt;
}) {
  const [serial, setSerial] = useState(initialSerial);

  const updateSerial = useCallback(
    (mode: "prev" | "next" | "first" | "last") => {
      if (serials.length === 0) return;
      setSerial((prevSerial) => {
        if (mode === "first") {
          return serials[0] ?? prevSerial;
        }
        if (mode === "last") {
          return serials[serials.length - 1] ?? prevSerial;
        }
        if (mode === "prev") {
          if (objekt.onOffline === "online") {
            return prevSerial - 1 > 0 ? prevSerial - 1 : 1;
          }
          const newSerial = serials.findLast((serial) => serial < prevSerial);
          return newSerial ?? prevSerial;
        }
        if (mode === "next") {
          if (objekt.onOffline === "online") {
            return prevSerial + 1;
          }
          const newSerial = serials.find((serial) => serial > prevSerial);
          return newSerial ?? prevSerial;
        }
        return prevSerial;
      });
    },
    [serials, objekt],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <NumberFieldPrimitive
          minValue={0}
          aria-label="Serial no."
          value={serial}
          onChange={setSerial}
          isWheelDisabled
          className="grow"
        >
          <InputGroup>
            <Input className="tabular-nums" />
          </InputGroup>
        </NumberFieldPrimitive>
        <Button
          size="sq-md"
          intent="outline"
          className="flex-none"
          onPress={() => updateSerial("first")}
        >
          <CaretLineLeftIcon />
        </Button>
        <Button
          size="sq-md"
          intent="outline"
          className="flex-none"
          onPress={() => updateSerial("prev")}
        >
          <CaretLeftIcon />
        </Button>
        <Button
          size="sq-md"
          intent="outline"
          className="flex-none"
          onPress={() => updateSerial("next")}
        >
          <CaretRightIcon />
        </Button>
        <Button
          size="sq-md"
          intent="outline"
          className="flex-none"
          onPress={() => updateSerial("last")}
        >
          <CaretLineRightIcon />
        </Button>
      </div>

      <TradeTable slug={objekt.slug} serial={serial} />
    </div>
  );
}

function TradeTable({ slug, serial }: { slug: string; serial: number }) {
  const { data, status, refetch } = useQuery({
    queryFn: () => {
      return ofetch<ObjektTransferResult>(`/api/objekts/transfers/${slug}/${serial}`);
    },
    queryKey: ["objekts", "transfer", slug, serial],
    retry: 1,
    staleTime: 0,
  });

  if (status === "pending")
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">{m.objekt_owner()}</span>
            <Skeleton className="h-[24px] w-24" soft />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">{m.objekt_token_id()}</span>
            <div className="flex items-center gap-2">
              <Skeleton className="h-[24px] w-30" soft />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">{m.objekt_transferable()}</span>
            <Skeleton className="h-[20px] w-8" soft />
          </div>
        </div>
        <Skeleton className="h-20 w-full rounded-lg" soft />
      </div>
    );

  if (status === "error") return <ErrorFallbackRender resetErrorBoundary={() => refetch()} />;

  if (data.hide) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-3">
        <LockIcon size={64} weight="light" />
        <span>{m.objekt_objekt_private()}</span>
      </div>
    );
  }

  if (!data.owner) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-3">
        <QuestionMarkIcon size={64} weight="light" />
        <span>{m.objekt_not_found_objekt()}</span>
      </div>
    );
  }

  return <TradeTableContent data={data} />;
}

function TradeTableContent({ data }: { data: ObjektTransferResult }) {
  const [, copy] = useCopyToClipboard();

  const list = useAsyncList({
    load() {
      return {
        items: data.transfers,
        sortDescriptor: {
          column: "timestamp",
          direction: "descending",
        },
      };
    },
    getKey(item) {
      return item.id;
    },
    async sort({ items, sortDescriptor }) {
      return {
        items: items.toSorted((a, b) => {
          let cmp = 0;
          if (sortDescriptor.column === "timestamp") {
            const aTime = new Date(a.timestamp).getTime();
            const bTime = new Date(b.timestamp).getTime();
            cmp = aTime < bTime ? -1 : aTime > bTime ? 1 : 0;
          }
          if (sortDescriptor.direction === "descending") cmp *= -1;
          return cmp;
        }),
      };
    },
  });

  const ownerNickname = data.transfers.find(
    (a) => a.to.toLowerCase() === data.owner?.toLowerCase(),
  )?.nickname;

  const handleCopy = async (tokenId: string | undefined) => {
    await copy(tokenId ?? "");
    toast.success(m.objekt_token_id_copied());
  };

  useEffect(() => {
    list.reload();
  }, [data]);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{m.objekt_owner()}</span>
          <UserLink address={data.owner} nickname={ownerNickname} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{m.objekt_token_id()}</span>
          <div className="flex items-center gap-2">
            <ExternalLink
              href={`https://opensea.io/item/abstract/${Addresses.OBJEKT}/${data.tokenId}`}
              className="inline-flex cursor-pointer items-center gap-2 font-mono"
              rel="noopener noreferrer"
              target="_blank"
            >
              {data.tokenId}
              <ArrowTopRightOnSquareIcon className="text-muted-fg size-4" />
            </ExternalLink>
            <CopyIcon
              size={16}
              className="text-muted-fg cursor-pointer select-none"
              onClick={() => handleCopy(data.tokenId)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{m.objekt_transferable()}</span>
          <Badge intent={data.transferable ? "info" : "danger"}>
            {data.transferable ? m.objekt_yes() : m.objekt_no()}
          </Badge>
        </div>
      </div>

      <Card className="py-0">
        <CardContent className="border-t-0! px-3">
          <Table
            className="[--gutter:--spacing(3)]"
            bleed
            aria-label="Trades"
            sortDescriptor={list.sortDescriptor}
            onSortChange={(desc) => list.sort(desc)}
          >
            <TableHeader>
              <TableColumn isRowHeader>{m.objekt_owner()}</TableColumn>
              <TableColumn id="timestamp" allowsSorting minWidth={200}>
                {m.objekt_date()}
              </TableColumn>
            </TableHeader>
            <TableBody renderEmptyState={() => null}>
              {list.items.map((item) => (
                <TableRow key={item.id} id={item.id}>
                  <TableCell>
                    <UserLink address={item.to} nickname={item.nickname} />
                  </TableCell>
                  <TableCell>{format(item.timestamp, "yyyy/MM/dd hh:mm:ss a")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
