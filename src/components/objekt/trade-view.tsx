"use client";

import { IconArrowLeft, IconArrowRight, IconOpenLink } from "@intentui/icons";
import { LockIcon, QuestionMarkIcon } from "@phosphor-icons/react/dist/ssr";
import { QueryErrorResetBoundary, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { ofetch } from "ofetch";
import { Suspense, useCallback, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { OBJEKT_CONTRACT } from "@/lib/utils";
import { cn } from "@/utils/classes";
import ErrorFallbackRender from "../error-boundary";
import { Badge, Button, Card, Link, Loader, NumberField, Table } from "../ui";
import UserLink from "../user-link";
import type { ObjektSerial, ObjektTransferResponse } from "./common";

type TradeViewProps = {
  objekt: ValidObjekt;
  serial: number | null;
};

const fetchObjektsQuery = (slug: string) => ({
  queryKey: ["objekts", "list", slug],
  queryFn: async () =>
    await ofetch<{ serials: ObjektSerial[] }>(`/api/objekts/list/${slug}`).then(
      (res) => res.serials,
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

function TradeViewRender({ objekt, serial }: TradeViewProps) {
  const { data } = useSuspenseQuery(fetchObjektsQuery(objekt.slug));

  return (
    <>
      {data.length > 0 && (
        <Trades serials={data} initialSerial={serial ?? data[0]} objekt={objekt} />
      )}
    </>
  );
}

function Trades({
  serials,
  initialSerial,
  objekt,
}: {
  serials: ObjektSerial[];
  initialSerial: number;
  objekt: ValidObjekt;
}) {
  const [serial, setSerial] = useState(initialSerial);

  const updateSerial = useCallback(
    (mode: "prev" | "next") => {
      setSerial((prevSerial) => {
        if (mode === "prev") {
          const newSerial = serials.filter((serial) => serial < prevSerial).pop();
          return newSerial ?? prevSerial;
        }

        const newSerial = serials.filter((serial) => serial > prevSerial)?.[0];
        return newSerial ?? prevSerial;
      });
    },
    [serials],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <NumberField
          minValue={1}
          className="grow"
          aria-label="Serial no."
          value={serial}
          onChange={setSerial}
          isWheelDisabled
        />
        <Button
          size="sq-md"
          intent="outline"
          className="flex-none"
          onClick={() => updateSerial("prev")}
        >
          <IconArrowLeft />
        </Button>
        <Button
          size="sq-md"
          intent="outline"
          className="flex-none"
          onClick={() => updateSerial("next")}
        >
          <IconArrowRight />
        </Button>
      </div>

      <TradeTable objekt={objekt} serial={serial} />
    </div>
  );
}

function TradeTable({ objekt, serial }: { objekt: ValidObjekt; serial: number }) {
  const t = useTranslations("objekt");
  const { data, status, refetch } = useQuery({
    queryFn: async () =>
      await ofetch<ObjektTransferResponse>(`/api/objekts/transfers/${objekt.slug}/${serial}`),
    queryKey: ["objekts", "transfer", objekt.slug, serial],
    retry: 1,
    staleTime: 0,
  });

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

  if (data.hide)
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-3">
        <LockIcon size={64} weight="light" />
        <p>Objekt Private</p>
      </div>
    );

  if (!data.owner)
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-3">
        <QuestionMarkIcon size={64} weight="light" />
        <p>Not found</p>
      </div>
    );

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{t("owner")}</span>
          <span>
            <UserLink address={data.owner} nickname={ownerNickname} />
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{t("token_id")}</span>
          <span>
            <Link
              href={`https://magiceden.io/item-details/abstract/${OBJEKT_CONTRACT}/${data.tokenId}`}
              className="inline-flex cursor-pointer items-center gap-2"
              target="_blank"
            >
              {data.tokenId}
              <IconOpenLink />
            </Link>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{t("transferable")}</span>
          <Badge
            className={cn("text-xs")}
            intent={!data.transferable ? "custom" : "info"}
            isCircle={false}
          >
            {data.transferable ? "Yes" : "No"}
          </Badge>
        </div>
      </div>

      <Card className="py-0">
        <Card.Content className="px-3">
          <Table className="[--gutter:--spacing(3)]" bleed aria-label="Trades">
            <Table.Header>
              <Table.Column isRowHeader>{t("owner")}</Table.Column>
              <Table.Column minWidth={200}>{t("date")}</Table.Column>
            </Table.Header>
            <Table.Body items={data.transfers}>
              {(item) => (
                <Table.Row id={item.id}>
                  <Table.Cell>
                    <UserLink address={item.to} nickname={item.nickname} />
                  </Table.Cell>
                  <Table.Cell>{format(item.timestamp, "yyyy/MM/dd hh:mm:ss a")}</Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        </Card.Content>
      </Card>
    </>
  );
}
