"use client";

import React, { useEffect, useState } from "react";
import { Card } from "../ui";
import { Transfer } from "@/lib/server/db/indexer/schema";
import { NULL_ADDRESS, SPIN_ADDRESS } from "@/lib/utils";
import { UserAddress } from "@/lib/server/db/schema";
import UserLink from "../user-link";
import { format } from "date-fns";
import { OwnedObjekt } from "@/lib/universal/objekts";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { env } from "@/env";
import ReconnectingWebSocket from "reconnecting-websocket";
import ObjektModal from "../objekt/objekt-modal";
import {
  ArrowsClockwiseIcon,
  BroadcastIcon,
  LeafIcon,
  PaperPlaneTiltIcon,
} from "@phosphor-icons/react/dist/ssr";

export default function ActivityRender() {
  return (
    <div className="flex flex-col gap-6 pt-2 pb-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Activity</h2>
        <p className="text-muted-fg text-sm">Latest activity in realtime</p>
      </div>
      <ObjektModalProvider initialTab="trades">
        <Activity />
      </ObjektModalProvider>
    </div>
  );
}

type Data = {
  transfer: Transfer;
  objekt: OwnedObjekt;
  nicknames: Pick<UserAddress, "address" | "nickname">[];
};
type EventData = { type: string; data: Data };

function Activity() {
  const [transfers, setTransfers] = useState<Data[]>([]);

  useEffect(() => {
    const ws = new ReconnectingWebSocket(
      env.NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL!
    );

    ws.onmessage = (event) => {
      const { data } = JSON.parse(event.data) as EventData;
      setTransfers((prev) => [data, ...prev.slice(0, 99)]);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <Card className="py-0">
      {transfers.length > 0 ? (
        <div className="relative w-full overflow-auto">
          <table className="table w-full min-w-full caption-bottom border-spacing-0 text-sm outline-hidden">
            <thead data-slot="table-header" className="border-b">
              <tr>
                <th className="relative whitespace-nowrap px-3 py-2.5 text-left font-medium outline-hidden">
                  Event
                </th>
                <th className="relative whitespace-nowrap px-3 py-2.5 text-left font-medium outline-hidden">
                  Objekt
                </th>
                <th className="relative whitespace-nowrap px-3 py-2.5 text-left font-medium outline-hidden">
                  Serial
                </th>
                <th className="relative whitespace-nowrap px-3 py-2.5 text-left font-medium outline-hidden">
                  From
                </th>
                <th className="relative whitespace-nowrap px-3 py-2.5 text-left font-medium outline-hidden">
                  To
                </th>
                <th className="relative whitespace-nowrap px-3 py-2.5 text-left font-medium outline-hidden">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="[&_.tr:last-child]:border-0">
              {transfers.map((item) => (
                <ObjektModal key={item.transfer.id} objekts={[item.objekt]}>
                  {({ openObjekts }) => (
                    <ActivityRow item={item} open={openObjekts} />
                  )}
                </ObjektModal>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col justify-center gap-3 items-center h-64">
          <BroadcastIcon size={64} weight="light" />
          <p>Waiting for realtime update</p>
        </div>
      )}
    </Card>
  );
}

function ActivityRow({ item, open }: { item: Data; open: () => void }) {
  const fromNickname = item.nicknames.find(
    (a) => a.address.toLowerCase() === item.transfer.from
  )?.nickname;

  const toNickname = item.nicknames.find(
    (a) => a.address.toLowerCase() === item.transfer.to
  )?.nickname;

  const from =
    item.transfer.from === NULL_ADDRESS ? (
      <span>COSMO</span>
    ) : (
      <UserLink address={item.transfer.from} nickname={fromNickname} />
    );

  const to =
    item.transfer.to === SPIN_ADDRESS ? (
      <span>COSMO Spin</span>
    ) : (
      <UserLink address={item.transfer.to} nickname={toNickname} />
    );

  return (
    <tr
      key={item.transfer.id}
      className="tr group relative cursor-default border-b text-fg outline-hidden ring-primary focus:ring-0 focus-visible:ring-1 duration-200 ease-out-quint animate-in slide-in-from-top *:animate-live-animation-bg"
    >
      <td className="group whitespace-nowrap px-3 py-2.5 outline-hidden">
        <div className="flex items-center gap-2 font-semibold">
          {item.transfer.from === NULL_ADDRESS ? (
            <>
              <LeafIcon size={18} weight="light" />
              <span>Mint</span>
            </>
          ) : item.transfer.to === SPIN_ADDRESS ? (
            <>
              <ArrowsClockwiseIcon size={18} weight="light" />
              <span>Spin</span>
            </>
          ) : (
            <>
              <PaperPlaneTiltIcon size={18} weight="light" />
              <span>Transfer</span>
            </>
          )}
        </div>
      </td>
      <td
        className="group whitespace-nowrap px-3 py-2.5 outline-hidden cursor-pointer"
        onClick={open}
      >
        {item.objekt.collectionId}
      </td>
      <td className="group whitespace-nowrap px-3 py-2.5 outline-hidden">
        {item.objekt.serial}
      </td>
      <td className="group whitespace-nowrap px-3 py-2.5 outline-hidden">
        {from}
      </td>
      <td className="group whitespace-nowrap px-3 py-2.5 outline-hidden">
        {to}
      </td>
      <td className="group whitespace-nowrap px-3 py-2.5 outline-hidden">
        {format(item.transfer.timestamp, "yyyy/MM/dd hh:mm:ss a")}
      </td>
    </tr>
  );
}
