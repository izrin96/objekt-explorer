"use client";

import {
  QueryErrorResetBoundary,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { Suspense, useCallback, useMemo, useState } from "react";
import { Badge, Button, Card, Loader, NumberField, Table } from "../ui";
import { IconArrowLeft, IconArrowRight } from "justd-icons";
import { format } from "date-fns";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-fallback";
import UserLink from "../user-link";
import { ObjektSerial, ObjektTransfer } from "./common";
import { cn } from "@/utils/classes";

type TradeViewProps = {
  slug: string;
  initialSerial?: number;
};

export const fetchObjektsQuery = (slug: string) => ({
  queryKey: ["objekts", "list", slug],
  queryFn: async ({}) =>
    await ofetch<{ objekts: ObjektSerial[] }>(`/api/objekts/list/${slug}`).then(
      (res) => res.objekts
    ),
});

export default function TradeView({ ...props }: TradeViewProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <Suspense
            fallback={
              <div className="flex justify-center">
                <Loader />
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

function TradeViewRender({ slug, initialSerial }: TradeViewProps) {
  const { data } = useSuspenseQuery(fetchObjektsQuery(slug));

  const objekts = useMemo(() => data ?? [], [data]);

  return (
    <>
      {objekts.length > 0 && (
        <Trades
          objekts={objekts}
          initialSerial={initialSerial ?? objekts[0].serial}
          slug={slug}
        />
      )}
    </>
  );
}

function Trades({
  objekts,
  initialSerial,
  slug,
}: {
  objekts: ObjektSerial[];
  initialSerial: number;
  slug: string;
}) {
  const [serial, setSerial] = useState(initialSerial);

  const objekt = useMemo(
    () => objekts.find((objekt) => objekt.serial === serial),
    [serial, objekts]
  );

  const updateSerial = useCallback(
    (mode: "prev" | "next") => {
      setSerial((prevSerial) => {
        if (mode == "prev") {
          const newSerial = objekts
            .filter((objekt) => objekt.serial < prevSerial)
            .pop()?.serial;
          return newSerial ?? prevSerial;
        }

        const newSerial = objekts.filter(
          (objekt) => objekt.serial > prevSerial
        )?.[0]?.serial;
        return newSerial ?? prevSerial;
      });
    },
    [objekts]
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        <NumberField
          minValue={0}
          className="grow"
          aria-label="Serial no."
          value={serial}
          onChange={setSerial}
        />
        <Button
          size="square-petite"
          appearance="outline"
          className="flex-none"
          onPress={() => updateSerial("prev")}
        >
          <IconArrowLeft />
        </Button>
        <Button
          size="square-petite"
          appearance="outline"
          className="flex-none"
          onPress={() => updateSerial("next")}
        >
          <IconArrowRight />
        </Button>
      </div>

      {objekt && <TradeTable objekt={objekt} slug={slug} serial={serial} />}
    </div>
  );
}

function TradeTable({
  objekt,
  slug,
  serial,
}: {
  objekt: ObjektSerial;
  slug: string;
  serial: number;
}) {
  const { data, status, refetch } = useQuery({
    queryFn: async () =>
      await ofetch<{ transfers: ObjektTransfer[] }>(
        `/api/objekts/transfers/${slug}/${serial}`
      ).then((res) => res.transfers),
    queryKey: ["objekts", "transfer", slug, serial],
    retry: 1,
  });

  const ownerNickname = useMemo(
    () =>
      data?.find((a) => a.to.toLowerCase() === objekt.owner.toLowerCase())
        ?.nickname,
    [data, objekt]
  );

  if (status === "pending")
    return (
      <div className="self-center">
        <Loader />
      </div>
    );

  if (status === "error")
    return <ErrorFallbackRender resetErrorBoundary={() => refetch()} />;

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">Owner</span>
          <span>
            <UserLink address={objekt.owner} nickname={ownerNickname} />
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">Transferable</span>
          <Badge
            className={cn(
              "text-sm",
              !objekt.transferable &&
                "bg-pink-500/15 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300"
            )}
            shape="square"
          >
            {objekt.transferable ? "Yes" : "No"}
          </Badge>
        </div>
      </div>

      <Card>
        <Table allowResize aria-label="Trades">
          <Table.Header>
            <Table.Column isRowHeader isResizable>
              Owner
            </Table.Column>
            <Table.Column minWidth={200}>Date</Table.Column>
          </Table.Header>
          <Table.Body items={data}>
            {(item) => (
              <Table.Row id={item.id}>
                <Table.Cell>
                  <UserLink address={item.to} nickname={item.nickname} />
                </Table.Cell>
                <Table.Cell>
                  {format(item.timestamp, "yyyy/MM/dd hh:mm:ss a")}
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </Card>
    </>
  );
}
