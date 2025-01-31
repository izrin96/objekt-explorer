"use client";

import {
  QueryErrorResetBoundary,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { Suspense, useCallback, useMemo, useState } from "react";
import { Badge, Button, Card, Loader, NumberField, Table } from "../ui";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCircleQuestionmark,
} from "justd-icons";
import { format } from "date-fns";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-fallback";
import UserLink from "../user-link";
import { ObjektSerial, ObjektTransferResponse } from "./common";
import { cn } from "@/utils/classes";
import { useObjektModal } from "@/hooks/use-objekt-modal";

type TradeViewProps = {
  slug: string;
};

export const fetchObjektsQuery = (slug: string) => ({
  queryKey: ["objekts", "list", slug],
  queryFn: async ({}) =>
    await ofetch<{ serials: ObjektSerial[] }>(`/api/objekts/list/${slug}`).then(
      (res) => res.serials
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

function TradeViewRender({ slug }: TradeViewProps) {
  const { currentSerial } = useObjektModal();
  const { data } = useSuspenseQuery(fetchObjektsQuery(slug));

  return (
    <>
      {data.length > 0 && (
        <Trades
          serials={data}
          initialSerial={currentSerial ?? data[0]}
          slug={slug}
        />
      )}
    </>
  );
}

function Trades({
  serials,
  initialSerial,
  slug,
}: {
  serials: ObjektSerial[];
  initialSerial: number;
  slug: string;
}) {
  const [serial, setSerial] = useState(initialSerial);

  const updateSerial = useCallback(
    (mode: "prev" | "next") => {
      setSerial((prevSerial) => {
        if (mode == "prev") {
          const newSerial = serials
            .filter((serial) => serial < prevSerial)
            .pop();
          return newSerial ?? prevSerial;
        }

        const newSerial = serials.filter((serial) => serial > prevSerial)?.[0];
        return newSerial ?? prevSerial;
      });
    },
    [serials]
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
          isWheelDisabled
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

      <TradeTable slug={slug} serial={serial} />
    </div>
  );
}

function TradeTable({ slug, serial }: { slug: string; serial: number }) {
  const { data, status, refetch } = useQuery({
    queryFn: async () =>
      await ofetch<ObjektTransferResponse>(
        `/api/objekts/transfers/${slug}/${serial}`
      ),
    queryKey: ["objekts", "transfer", slug, serial],
    retry: 1,
  });

  const ownerNickname = useMemo(
    () =>
      data?.transfers?.find(
        (a) => a.to.toLowerCase() === data.owner?.toLowerCase()
      )?.nickname,
    [data]
  );

  if (status === "pending")
    return (
      <div className="self-center">
        <Loader variant="ring" />
      </div>
    );

  if (status === "error")
    return <ErrorFallbackRender resetErrorBoundary={() => refetch()} />;

  if (!data.owner)
    return (
      <div className="flex flex-col justify-center gap-3 items-center text-muted-fg py-3">
        <IconCircleQuestionmark className="size-12" />
        <p>Not found</p>
      </div>
    );

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">Owner</span>
          <span>
            <UserLink address={data.owner} nickname={ownerNickname} />
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">Transferable</span>
          <Badge
            className={cn(
              "text-sm",
              !data.transferable &&
                "bg-pink-500/15 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300"
            )}
            shape="square"
          >
            {data.transferable ? "Yes" : "No"}
          </Badge>
        </div>
      </div>

      <Card>
        <Table aria-label="Trades">
          <Table.Header>
            <Table.Column isRowHeader>Owner</Table.Column>
            <Table.Column minWidth={200}>Date</Table.Column>
          </Table.Header>
          <Table.Body items={data.transfers}>
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
