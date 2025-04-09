"use client";

import { Badge, Link } from "../ui";
import { AggregatedTransfer } from "@/lib/universal/transfers";
import UserLink from "../user-link";
import { format } from "date-fns";
import { getCollectionShortId } from "@/lib/universal/objekts";
import { memo, useCallback } from "react";
import { IconOpenLink } from "@intentui/icons";
import { NULL_ADDRESS, SPIN_ADDRESS } from "@/lib/utils";
import { useObjektModal } from "@/hooks/use-objekt-modal";

export default memo(function TradeRow({
  row,
  address,
}: {
  row: AggregatedTransfer;
  address: string;
}) {
  const { openObjekts } = useObjektModal();
  const isReceiver = row.transfer.to.toLowerCase() === address.toLowerCase();

  const tdClass = "group whitespace-nowrap px-3 py-3";

  const name = `${getCollectionShortId(row.objekt)}`;

  const action = isReceiver ? (
    <Badge intent="info">Received From</Badge>
  ) : (
    <Badge intent="custom">Sent To</Badge>
  );

  const onOpen = useCallback(
    () => openObjekts([row.objekt]),
    [row, openObjekts]
  );

  const user = isReceiver ? (
    row.transfer.from === NULL_ADDRESS ? (
      <span>COSMO</span>
    ) : (
      <UserLink address={row.transfer.from} nickname={row.fromNickname} />
    )
  ) : row.transfer.to === SPIN_ADDRESS ? (
    <span>COSMO Spin</span>
  ) : (
    <UserLink address={row.transfer.to} nickname={row.toNickname} />
  );

  return (
    <>
      <tr className="tr group relative border-b bg-transparent text-fg">
        <td className={tdClass}>
          {format(row.transfer.timestamp, "yyyy/MM/dd hh:mm:ss a")}
        </td>
        <td className={tdClass}>
          <Link
            onPress={onOpen}
            className="cursor-pointer inline-flex gap-2 items-center"
          >
            {name}
            <IconOpenLink />
          </Link>
        </td>
        <td className={tdClass}>{row.objekt.serial}</td>
        <td className={tdClass}>{action}</td>
        <td className={tdClass}>{user}</td>
      </tr>
    </>
  );
});
