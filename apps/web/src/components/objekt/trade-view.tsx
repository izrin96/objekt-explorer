"use client";

import type { ObjektTransferResult, ValidObjekt } from "@repo/lib/objekts";

import { IconOpenLink } from "@intentui/icons";
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
import { QueryErrorResetBoundary, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { ofetch } from "ofetch";
import { Suspense, useCallback, useEffect, useState } from "react";
import { NumberField as NumberFieldPrimitive } from "react-aria-components";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import { getBaseURL } from "@/lib/utils";
import { cn } from "@/utils/classes";

import ErrorFallbackRender from "../error-boundary";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input, InputGroup } from "../ui/input";
import { Link } from "../ui/link";
import { Loader } from "../ui/loader";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "../ui/table";
import UserLink from "../user-link";

type TradeViewProps = {
  objekt: ValidObjekt;
  serial: number | null;
};

const fetchObjektsQuery = (slug: string) => ({
  queryKey: ["objekts", "list", slug],
  queryFn: () => {
    const url = new URL(`/api/objekts/list/${slug}`, getBaseURL());
    return ofetch<{ serials: number[] }>(url.toString()).then((res) => res.serials);
  },
});

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
  const { data } = useSuspenseQuery(fetchObjektsQuery(objekt.slug));

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
          onClick={() => updateSerial("first")}
        >
          <CaretLineLeftIcon />
        </Button>
        <Button
          size="sq-md"
          intent="outline"
          className="flex-none"
          onClick={() => updateSerial("prev")}
        >
          <CaretLeftIcon />
        </Button>
        <Button
          size="sq-md"
          intent="outline"
          className="flex-none"
          onClick={() => updateSerial("next")}
        >
          <CaretRightIcon />
        </Button>
        <Button
          size="sq-md"
          intent="outline"
          className="flex-none"
          onClick={() => updateSerial("last")}
        >
          <CaretLineRightIcon />
        </Button>
      </div>

      <TradeTable objekt={objekt} serial={serial} />
    </div>
  );
}

type TransferItem = ObjektTransferResult["transfers"][number];

function TradeTable({ objekt, serial }: { objekt: ValidObjekt; serial: number }) {
  const [, copy] = useCopyToClipboard();
  const t = useTranslations("objekt");
  const { data, status, refetch } = useQuery({
    queryFn: () => {
      const url = new URL(`/api/objekts/transfers/${objekt.slug}/${serial}`, getBaseURL());
      return ofetch<ObjektTransferResult>(url.toString());
    },
    queryKey: ["objekts", "transfer", objekt.slug, serial],
    retry: 1,
    staleTime: 0,
  });

  const handleCopy = useCallback(async (tokenId: string | undefined) => {
    await copy(tokenId ?? "");
    toast.success("Token ID copied");
  }, []);

  const list = useAsyncList<TransferItem>({
    async load() {
      return {
        items: data?.transfers ?? [],
        sortDescriptor: {
          column: "timestamp",
          direction: "descending",
        },
      };
    },
    async sort({ items, sortDescriptor }) {
      return {
        items: items.toSorted((a, b) => {
          let cmp = 0;
          if (sortDescriptor.column === "timestamp") {
            const aTime = new Date(a.timestamp).getTime();
            const bTime = new Date(b.timestamp).getTime();
            if (aTime < bTime) cmp = -1;
            else if (aTime > bTime) cmp = 1;
            else cmp = 0;
          }
          if (sortDescriptor.direction === "descending") cmp *= -1;
          return cmp;
        }),
      };
    },
  });

  useEffect(() => {
    if (data) {
      list.reload();
    }
  }, [data]);

  if (status === "pending")
    return (
      <div className="self-center">
        <Loader variant="ring" />
      </div>
    );

  if (status === "error") return <ErrorFallbackRender resetErrorBoundary={() => refetch()} />;

  const ownerNickname = data.transfers.find(
    (a) => a.to.toLowerCase() === data.owner?.toLowerCase(),
  )?.nickname;

  if (data.hide) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-3">
        <LockIcon size={64} weight="light" />
        <p>Objekt Private</p>
      </div>
    );
  }

  if (!data.owner) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-3">
        <QuestionMarkIcon size={64} weight="light" />
        <p>Not found</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{t("owner")}</span>
          <UserLink address={data.owner} nickname={ownerNickname} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{t("token_id")}</span>
          <div className="flex items-center gap-2">
            <Link
              href={`https://opensea.io/item/abstract/${Addresses.OBJEKT}/${data.tokenId}`}
              className="inline-flex cursor-pointer items-center gap-2 font-mono"
              target="_blank"
            >
              {data.tokenId}
              <IconOpenLink />
            </Link>
            <CopyIcon
              size={16}
              className="cursor-pointer"
              onClick={() => handleCopy(data.tokenId)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{t("transferable")}</span>
          <Badge className={cn("text-xs")} intent={!data.transferable ? "custom" : "info"}>
            {data.transferable ? "Yes" : "No"}
          </Badge>
        </div>
      </div>

      <Card className="py-0">
        <CardContent className="px-3">
          <Table
            className="[--gutter:--spacing(3)]"
            bleed
            aria-label="Trades"
            sortDescriptor={list.sortDescriptor}
            onSortChange={(desc) => list.sort(desc)}
          >
            <TableHeader>
              <TableColumn isRowHeader>{t("owner")}</TableColumn>
              <TableColumn id="timestamp" allowsSorting minWidth={200}>
                {t("date")}
              </TableColumn>
            </TableHeader>
            <TableBody>
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
