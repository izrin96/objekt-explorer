"use client";

import { Badge, Link } from "../ui";
import { AggregatedTransfer } from "@/lib/universal/transfers";
import UserLink from "../user-link";
import { format } from "date-fns";
import { getCollectionShortId } from "@/lib/universal/objekts";
import { memo, useCallback } from "react";
import { IconOpenLink } from "justd-icons";
import { NULL_ADDRESS } from "@/lib/utils";
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
    <Badge className="bg-sky-500/15 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
      Received From
    </Badge>
  ) : (
    <Badge className="bg-pink-500/15 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300">
      Sent To
    </Badge>
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
  ) : (
    <UserLink address={row.transfer.to} nickname={row.toNickname} />
  );

  return (
    <>
      <tr className="tr group relative border-b bg-bg text-fg">
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
